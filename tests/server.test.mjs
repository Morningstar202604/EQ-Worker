import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAppServer } from '../dist-server/server.mjs';

/**
 * 后台服务测试。直接起真实 HTTP 服务打真实请求——
 * 用 mock 请求对象测路由是自欺欺人，鉴权、路径穿越这些恰恰要在真实 socket 上验。
 *
 * 测的是构建产物 dist-server/server.mjs 而非源码：部署时跑的就是它，
 * 打包配置出错（比如 node: 内置模块没外置）只有在这一层才能暴露。
 * 前置：node scripts/build-server.mjs
 */

function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'eqw-srv-'));
  return { dir, dataFile: join(dir, 'data.json'), cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

async function withServer(fn, opts = {}) {
  const s = sandbox();
  const app = createAppServer({ port: 0, dataFile: s.dataFile, token: 'test-token', ...opts });
  const { url } = await app.listen();
  try {
    await fn({ url, token: 'test-token', app, dataFile: s.dataFile });
  } finally {
    await app.close();
    s.cleanup();
  }
}

const api = (url, path, token, init = {}) =>
  fetch(url.replace(/\/$/, '') + '/api' + path, {
    ...init,
    headers: { ...(token ? { authorization: 'Bearer ' + token } : {}), 'content-type': 'application/json', ...(init.headers ?? {}) }
  });

test('未带令牌的请求返回 401，带令牌正常', async () => {
  await withServer(async ({ url, token }) => {
    const no = await api(url, '/overview', '');
    assert.equal(no.status, 401);

    const ok = await api(url, '/overview', token);
    assert.equal(ok.status, 200);
    const d = await ok.json();
    assert.equal(d.metrics, null, '空库时 overallMetrics 为 null');
    assert.equal(d.counts.persons, 0);
  });
});

test('健康检查无需令牌', async () => {
  await withServer(async ({ url }) => {
    const r = await api(url, '/health', '');
    assert.equal(r.status, 200);
    const d = await r.json();
    assert.equal(d.ok, true);
  });
});

test('添加人脉后可在列表与详情中查到', async () => {
  await withServer(async ({ url, token }) => {
    const created = await api(url, '/persons', token, {
      method: 'POST',
      body: JSON.stringify({ name: '测试甲', identity: '同事', tags: ['项目组'], birthday: '03-05' })
    });
    assert.equal(created.status, 201, await created.clone().text());
    const person = await created.json();
    assert.equal(person.name, '测试甲');
    assert.deepEqual(person.tags, ['项目组']);

    const list = await (await api(url, '/persons', token)).json();
    assert.equal(list.persons.length, 1);
    assert.equal(list.persons[0].name, '测试甲');

    const detail = await (await api(url, '/persons/' + person.id, token)).json();
    assert.equal(detail.person.name, '测试甲');
    assert.ok(Array.isArray(detail.events));
  });
});

test('重名联系人被拒绝并返回 409', async () => {
  await withServer(async ({ url, token }) => {
    await api(url, '/persons', token, { method: 'POST', body: JSON.stringify({ name: '重名' }) });
    const dup = await api(url, '/persons', token, { method: 'POST', body: JSON.stringify({ name: '重名' }) });
    assert.equal(dup.status, 409);
  });
});

test('空姓名被拒绝', async () => {
  await withServer(async ({ url, token }) => {
    const r = await api(url, '/persons', token, { method: 'POST', body: JSON.stringify({ name: '   ' }) });
    assert.equal(r.status, 400);
  });
});

test('记录往来后账本与概览同步更新', async () => {
  await withServer(async ({ url, token }) => {
    const p = await (await api(url, '/persons', token, { method: 'POST', body: JSON.stringify({ name: '乙' }) })).json();
    const e = await api(url, '/events', token, {
      method: 'POST',
      body: JSON.stringify({ personId: p.id, type: 'gift_give', title: '生日送礼', amount: 800, occasion: '生日' })
    });
    assert.equal(e.status, 201);
    const ev = await e.json();
    assert.equal(ev.amount, 800);
    assert.equal(ev.dir, 'out', '送礼方向应自动判定为 out');

    const ledger = await (await api(url, '/ledger', token)).json();
    assert.equal(ledger.totals.given, 800);
    assert.equal(ledger.totals.received, 0);
  });
});

test('往来关联不存在的人脉被拒绝', async () => {
  await withServer(async ({ url, token }) => {
    const r = await api(url, '/events', token, { method: 'POST', body: JSON.stringify({ personId: 'nope', type: 'meal' }) });
    assert.equal(r.status, 400);
  });
});

test('非法事件类型被拒绝', async () => {
  await withServer(async ({ url, token }) => {
    const p = await (await api(url, '/persons', token, { method: 'POST', body: JSON.stringify({ name: '丙' }) })).json();
    const r = await api(url, '/events', token, { method: 'POST', body: JSON.stringify({ personId: p.id, type: 'not-a-type' }) });
    assert.equal(r.status, 400);
  });
});

test('删除往来后账本回退', async () => {
  await withServer(async ({ url, token }) => {
    const p = await (await api(url, '/persons', token, { method: 'POST', body: JSON.stringify({ name: '丁' }) })).json();
    const e = await (await api(url, '/events', token, { method: 'POST', body: JSON.stringify({ personId: p.id, type: 'gift_give', amount: 500 }) })).json();
    const del = await api(url, '/events/' + e.id, token, { method: 'DELETE' });
    assert.equal(del.status, 200);
    const ledger = await (await api(url, '/ledger', token)).json();
    assert.equal(ledger.totals.given, 0);
  });
});

test('导出返回可再导入的完整备份', async () => {
  await withServer(async ({ url, token }) => {
    await api(url, '/persons', token, { method: 'POST', body: JSON.stringify({ name: '戊' }) });
    const exp = await api(url, '/export', token);
    const text = await exp.text();
    const parsed = JSON.parse(text);
    assert.ok(parsed.persons || parsed.app || parsed.data, '导出内容应可解析');
  });
});

test('导入备份后数据替换成功', async () => {
  await withServer(async ({ url, token }) => {
    const backup = { persons: [{ id: 'x1', name: '导入甲' }], events: [] };
    const r = await api(url, '/import', token, { method: 'POST', body: JSON.stringify(backup) });
    assert.equal(r.status, 200, await r.clone().text());
    const list = await (await api(url, '/persons', token)).json();
    assert.equal(list.persons.length, 1);
    assert.equal(list.persons[0].name, '导入甲');
  });
});

test('空备份被拒绝，不会清空现有数据', async () => {
  await withServer(async ({ url, token }) => {
    await api(url, '/persons', token, { method: 'POST', body: JSON.stringify({ name: '己' }) });
    const r = await api(url, '/import', token, { method: 'POST', body: JSON.stringify({ persons: [], events: [] }) });
    assert.equal(r.status, 400);
    const list = await (await api(url, '/persons', token)).json();
    assert.equal(list.persons.length, 1, '拒绝导入不应动到现有数据');
  });
});

test('随礼与话术接口返回结构化结果', async () => {
  await withServer(async ({ url, token }) => {
    const p = await (await api(url, '/persons', token, { method: 'POST', body: JSON.stringify({ name: '庚', identity: '客户' }) })).json();
    const gift = await (await api(url, `/gift?personId=${p.id}&occasion=婚礼`, token)).json();
    assert.ok(gift.low <= gift.mid && gift.mid <= gift.high);
    assert.ok(gift.reasons.length > 0);

    const script = await (await api(url, '/script?scene=refuse_loan', token)).json();
    assert.equal(script.variants.length, 3);
  });
});

test('未知接口返回 404', async () => {
  await withServer(async ({ url, token }) => {
    const r = await api(url, '/no-such-endpoint', token);
    assert.equal(r.status, 404);
  });
});

test('静态资源目录穿越被阻断', async () => {
  const s = sandbox();
  const app = createAppServer({ port: 0, dataFile: s.dataFile, token: 't', staticDir: join(process.cwd(), 'dist-server/web') });
  const { url } = await app.listen();
  try {
    const r = await fetch(url + '..%2F..%2Fpackage.json');
    assert.notEqual(r.status, 200, '不应读到静态目录之外的文件');
    const body = await r.text();
    assert.ok(!body.includes('"devDependencies"'), '绝不能泄露仓库文件');
  } finally {
    await app.close();
    s.cleanup();
  }
});

test('数据写入后进程重启仍能读到（文件持久化）', async () => {
  const s = sandbox();
  try {
    const a1 = createAppServer({ port: 0, dataFile: s.dataFile, token: 't' });
    const u1 = (await a1.listen()).url;
    await api(u1, '/persons', 't', { method: 'POST', body: JSON.stringify({ name: '持久化' }) });
    await a1.close();

    const a2 = createAppServer({ port: 0, dataFile: s.dataFile, token: 't' });
    const u2 = (await a2.listen()).url;
    const list = await (await api(u2, '/persons', 't')).json();
    assert.equal(list.persons.length, 1);
    assert.equal(list.persons[0].name, '持久化');
    await a2.close();
  } finally {
    s.cleanup();
  }
});

test('doctor 接口报告数据健康状况', async () => {
  await withServer(async ({ url, token }) => {
    const empty = await (await api(url, '/doctor', token)).json();
    assert.equal(empty.ok, true, '空库应通过检查');
    assert.deepEqual(empty.issues, []);
    assert.equal(empty.stats.persons, 0);

    await api(url, '/persons', token, { method: 'POST', body: JSON.stringify({ name: '体检甲' }) });
    const after = await (await api(url, '/doctor', token)).json();
    assert.equal(after.stats.persons, 1);
    assert.equal(after.ok, true);
    assert.equal(typeof after.dataFile, 'string');
  });
});

/* 回归：删除往来时若落盘失败，必须回滚内存。
   服务进程常驻，不回滚的话这条往来会"接口里消失、磁盘上还在"，
   重启后又冒出来，账本数字来回跳。
   强制落盘失败的跨平台手法：把数据文件替换成同名目录——
   rename(临时文件 → 目录) 在 Windows 与 Linux 上都必然失败。 */
test('落盘失败时删除往来会回滚，内存与磁盘保持一致', async () => {
  const { mkdtempSync: mk, rmSync: rm, mkdirSync: mkd } = await import('node:fs');
  const s = sandbox();
  const app = createAppServer({ port: 0, dataFile: s.dataFile, token: 't' });
  const { url } = await app.listen();
  try {
    const person = await (await api(url, '/persons', 't', { method: 'POST', body: JSON.stringify({ name: '回滚甲' }) })).json();
    const event = await (await api(url, '/events', 't', {
      method: 'POST',
      body: JSON.stringify({ personId: person.id, type: 'gift_give', amount: 800, occasion: '婚礼' })
    })).json();
    assert.ok(event.id, '前置：往来应创建成功');

    // 破坏落盘：数据文件 → 同名目录（读走内存缓存仍正常，写必失败）
    rm(s.dataFile);
    mkd(s.dataFile);

    const del = await api(url, '/events/' + event.id, 't', { method: 'DELETE' });
    assert.equal(del.status, 500, '落盘失败应返回 500');

    const detail = await (await api(url, '/persons/' + person.id, 't')).json();
    assert.ok(
      detail.events.some((e) => e.id === event.id),
      '保存失败后内存必须回滚：这条往来仍应可见，不能"消失"在磁盘之外'
    );
  } finally {
    await app.close();
    s.cleanup();
  }
});

/* 回归：礼簿明细 CSV 导出（对应竞品调研中 gift-book / RenqingLedger 的标配能力）。
   BOM 必须在正文最前，Excel 直接打开才不乱码；金额大写随行输出。 */
test('礼簿 CSV 导出带 BOM、表头与大写金额', async () => {
  await withServer(async ({ url, token }) => {
    const person = await (await api(url, '/persons', token, { method: 'POST', body: JSON.stringify({ name: '礼簿甲' }) })).json();
    await api(url, '/events', token, {
      method: 'POST',
      body: JSON.stringify({ personId: person.id, type: 'gift_give', amount: 800, occasion: '婚礼' })
    });
    const res = await api(url, '/export/ledger.csv', token);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/csv/);
    // fetch 的 text() 会按 WHATWG 规范剥掉 BOM，必须用字节级断言验证 BOM 真的在
    const buf = await res.arrayBuffer();
    assert.deepEqual([...new Uint8Array(buf.slice(0, 3))], [0xEF, 0xBB, 0xBF], '必须以 UTF-8 BOM 开头');
    const text = new TextDecoder('utf-8').decode(buf);
    const lines = text.split(/\r?\n/);
    assert.equal(lines[0], '日期,姓名,身份,类型,场合,方向,金额(元),金额大写,备注');
    assert.match(lines[1], /礼簿甲/);
    assert.match(lines[1], /捌佰元整/);
  });
});

/* /gift 响应必须带大写金额（cn 字段），供界面与单据直接使用 */
test('随礼建议接口返回大写金额', async () => {
  await withServer(async ({ url, token }) => {
    await api(url, '/persons', token, { method: 'POST', body: JSON.stringify({ name: '大写乙' }) });
    const advice = await (await api(url, '/gift?personId=&occasion=婚礼', token)).json();
    assert.equal(typeof advice.cn.mid, 'string');
    assert.match(advice.cn.mid, /元整|角|分/);
  });
});
