import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * MCP 服务器测试。用官方 SDK 客户端走 stdio 真实握手——
 * MCP 是协议，光看代码是否"注册了工具"没意义，必须验证 listTools/callTool
 * 在真实 JSON-RPC 往返里能跑通，且返回值符合声明。
 *
 * 前置：node scripts/build-mcp.mjs
 */

async function withMcp(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'eqw-mcp-'));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(process.cwd(), 'dist-mcp/eq-worker-mcp.mjs')],
    env: { ...process.env, EQWORKER_DATA_DIR: dir },
    stderr: 'pipe'
  });
  const client = new Client({ name: 'eqw-test', version: '1.0.0' });
  await client.connect(transport);
  try {
    await fn({ client, dir });
  } finally {
    await client.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const parse = (r) => {
  const first = r.content?.[0];
  assert.ok(first && first.type === 'text', '工具应返回文本内容');
  return first.text;
};
const parseJson = (r) => JSON.parse(parse(r));

test('MCP 握手后可列出工具、资源与提示', async () => {
  await withMcp(async ({ client }) => {
    const tools = await client.listTools();
    const names = tools.tools.map((t) => t.name);
    for (const expected of ['get_overview', 'list_persons', 'get_person', 'get_ledger', 'advise_gift', 'write_script', 'record_event', 'add_person']) {
      assert.ok(names.includes(expected), `应注册工具 ${expected}`);
    }
    // 写工具必须标注为非只读，宿主才会弹确认
    const writeTool = tools.tools.find((t) => t.name === 'record_event');
    assert.equal(writeTool.annotations?.readOnlyHint, false, '写工具必须声明 readOnlyHint:false');
    const readTool = tools.tools.find((t) => t.name === 'get_overview');
    assert.equal(readTool.annotations?.readOnlyHint, true, '读工具应声明 readOnlyHint:true');

    const resources = await client.listResources();
    assert.ok(resources.resources.length >= 2);
    const prompts = await client.listPrompts();
    assert.ok(prompts.prompts.length >= 2);
  });
});

test('空库时工具给出引导文案而不是崩溃', async () => {
  await withMcp(async ({ client }) => {
    const r = await client.callTool({ name: 'get_overview', arguments: {} });
    assert.match(parse(r), /还没有|没有/);
    // 输出结构必须稳定：空库返回 {总数:0, 人脉:[]} 而不是纯文本
    const p = parseJson(await client.callTool({ name: 'list_persons', arguments: {} }));
    assert.equal(p.总数, 0);
    assert.deepEqual(p.人脉, []);
  });
});

test('add_person 后 list_persons 能查到（写读闭环）', async () => {
  await withMcp(async ({ client }) => {
    const add = await client.callTool({ name: 'add_person', arguments: { name: '测试甲', identity: '同事', tags: ['项目组'], birthday: '03-05' } });
    const added = parseJson(add);
    assert.equal(added.ok, true);
    assert.equal(added.已添加.name, '测试甲');

    const list = parseJson(await client.callTool({ name: 'list_persons', arguments: {} }));
    assert.equal(list.总数, 1);
    assert.equal(list.人脉[0].姓名, '测试甲');
    assert.equal(list.人脉[0].身份, '同事');
  });
});

test('重复 add_person 不会产生重复联系人', async () => {
  await withMcp(async ({ client }) => {
    await client.callTool({ name: 'add_person', arguments: { name: '重复' } });
    const second = await client.callTool({ name: 'add_person', arguments: { name: '重复' } });
    assert.match(parse(second), /已存在/);
    const list = parseJson(await client.callTool({ name: 'list_persons', arguments: {} }));
    assert.equal(list.总数, 1);
  });
});

test('record_event 写入后账本与详情同步更新', async () => {
  await withMcp(async ({ client }) => {
    await client.callTool({ name: 'add_person', arguments: { name: '乙' } });
    const rec = await client.callTool({ name: 'record_event', arguments: { personName: '乙', type: 'gift_give', title: '生日送礼', amount: 800, occasion: '生日' } });
    const r = parseJson(rec);
    assert.equal(r.ok, true);
    assert.equal(r.已记录.金额, 800);

    const ledger = parseJson(await client.callTool({ name: 'get_ledger', arguments: {} }));
    assert.equal(ledger.汇总.given, 800);

    const person = parseJson(await client.callTool({ name: 'get_person', arguments: { name: '乙' } }));
    assert.equal(person.往来记录.length, 1);
    assert.equal(person.往来记录[0].金额, 800);
  });
});

test('record_event 指向不存在的人时拒绝且不写脏数据', async () => {
  await withMcp(async ({ client }) => {
    const r = await client.callTool({ name: 'record_event', arguments: { personName: '查无此人', type: 'meal', title: 'x' } });
    assert.match(parse(r), /找不到/);
    const list = parseJson(await client.callTool({ name: 'list_persons', arguments: {} }));
    assert.equal(list.总数, 0);
  });
});

test('record_event 非法类型被拒绝', async () => {
  await withMcp(async ({ client }) => {
    await client.callTool({ name: 'add_person', arguments: { name: '丙' } });
    const r = await client.callTool({ name: 'record_event', arguments: { personName: '丙', type: '不存在类型', title: 'x' } });
    assert.match(parse(r), /不支持/);
  });
});

test('advise_gift 返回递增三档与计算依据', async () => {
  await withMcp(async ({ client }) => {
    await client.callTool({ name: 'add_person', arguments: { name: '陈姐', identity: '客户' } });
    const a = parseJson(await client.callTool({ name: 'advise_gift', arguments: { personName: '陈姐', occasion: '婚礼' } }));
    assert.ok(a.金额.从简 <= a.金额.建议);
    assert.ok(a.金额.建议 <= a.金额.重视);
    assert.ok(a.计算依据.length > 0);
  });
});

test('write_script 覆盖 16 个场景且每种给三档语气', async () => {
  await withMcp(async ({ client }) => {
    const scenes = ['reconnect', 'thanks', 'apology', 'ask_favor', 'decline', 'refuse_loan', 'collect_debt', 'gift', 'toast', 'visit_sick', 'decline_invite', 'festival', 'invite', 'follow_up', 'birthday', 'anniversary'];
    for (const scene of scenes) {
      const r = parseJson(await client.callTool({ name: 'write_script', arguments: { scene } }));
      assert.equal(r.话术.length, 3, `${scene} 应给三种语气`);
      assert.ok(r.话术.every((v) => v.文本.length > 5), `${scene} 话术不应为空`);
    }
    const bad = await client.callTool({ name: 'write_script', arguments: { scene: 'no-such' } });
    assert.match(parse(bad), /不存在/);
  });
});

test('资源可读取且内容是合法 JSON', async () => {
  await withMcp(async ({ client }) => {
    await client.callTool({ name: 'add_person', arguments: { name: '资源甲' } });
    for (const uri of ['eqworker://persons', 'eqworker://ledger']) {
      const res = await client.readResource({ uri });
      assert.ok(res.contents[0].text);
      assert.doesNotThrow(() => JSON.parse(res.contents[0].text), `${uri} 应为合法 JSON`);
    }
  });
});

test('提示可获取且包含真实工具调用指引', async () => {
  await withMcp(async ({ client }) => {
    const p = await client.getPrompt({ name: 'weekly_review' });
    assert.ok(p.messages[0].content.text.includes('get_overview'));
  });
});

test('写入落到真实文件，进程重启后仍在', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'eqw-mcp-persist-'));
  try {
    const t1 = new StdioClientTransport({
      command: process.execPath,
      args: [join(process.cwd(), 'dist-mcp/eq-worker-mcp.mjs')],
      env: { ...process.env, EQWORKER_DATA_DIR: dir },
      stderr: 'pipe'
    });
    const c1 = new Client({ name: 'a', version: '1' });
    await c1.connect(t1);
    await c1.callTool({ name: 'add_person', arguments: { name: '持久化甲' } });
    await c1.close();

    // 文件里应真有这条
    const raw = readFileSync(join(dir, 'eq-worker.json'), 'utf8');
    assert.match(raw, /持久化甲/);

    const t2 = new StdioClientTransport({
      command: process.execPath,
      args: [join(process.cwd(), 'dist-mcp/eq-worker-mcp.mjs')],
      env: { ...process.env, EQWORKER_DATA_DIR: dir },
      stderr: 'pipe'
    });
    const c2 = new Client({ name: 'b', version: '1' });
    await c2.connect(t2);
    const list = parseJson(await c2.callTool({ name: 'list_persons', arguments: {} }));
    assert.equal(list.总数, 1);
    assert.equal(list.人脉[0].姓名, '持久化甲');
    await c2.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('损坏的数据文件不会让服务崩成不可用，也不会覆盖原文件', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'eqw-mcp-broken-'));
  const file = join(dir, 'eq-worker.json');
  try {
    writeFileSync(file, 'not json at all', 'utf8');
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [join(process.cwd(), 'dist-mcp/eq-worker-mcp.mjs')],
      env: { ...process.env, EQWORKER_DATA_DIR: dir },
      stderr: 'pipe'
    });
    const client = new Client({ name: 'broken', version: '1' });
    // 连接可能成功也可能失败（取决于错误处理的时机），两种都可接受；
    // 关键是原文件不能被改写。
    try {
      await client.connect(transport);
      await client.callTool({ name: 'get_overview', arguments: {} }).catch(() => {});
      await client.close();
    } catch {
      void 0;
    }
    assert.equal(readFileSync(file, 'utf8'), 'not json at all', '损坏文件必须原样保留');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('search 工具跨人脉与往来命中', async () => {
  await withMcp(async ({ client }) => {
    await client.callTool({ name: 'add_person', arguments: { name: '搜索目标', identity: '客户' } });
    await client.callTool({ name: 'record_event', arguments: { personName: '搜索目标', type: 'meal', title: '一起吃了火锅' } });

    const r = parseJson(await client.callTool({ name: 'search', arguments: { keyword: '搜索目标' } }));
    assert.ok(r.命中联系人.length >= 1);
    assert.ok(r.命中往来.length >= 1);

    const miss = parseJson(await client.callTool({ name: 'search', arguments: { keyword: 'zzz不存在' } }));
    assert.equal(miss.命中联系人.length, 0);
    assert.equal(miss.命中往来.length, 0);
  });
});

test('reminders 工具：添加后可列出', async () => {
  await withMcp(async ({ client }) => {
    await client.callTool({ name: 'add_person', arguments: { name: '提醒对象' } });
    const add = parseJson(await client.callTool({ name: 'add_reminder', arguments: { personName: '提醒对象', content: '记得回礼' } }));
    assert.equal(add.ok, true);

    const list = parseJson(await client.callTool({ name: 'get_reminders', arguments: {} }));
    assert.equal(list.length, 1);
    assert.equal(list[0].内容, '记得回礼');
    assert.equal(list[0].状态, '待办');
    assert.equal(list[0].对象, '提醒对象');
  });
});

test('add_reminder 指向不存在的人时拒绝', async () => {
  await withMcp(async ({ client }) => {
    const r = await client.callTool({ name: 'add_reminder', arguments: { personName: '查无此人', content: 'x' } });
    assert.match(parse(r), /找不到/);
  });
});

test('get_practice_progress 返回段位与进度', async () => {
  await withMcp(async ({ client }) => {
    const p = parseJson(await client.callTool({ name: 'get_practice_progress', arguments: {} }));
    assert.equal(typeof p.段位, 'string');
    assert.equal(typeof p.智慧值, 'number');
    assert.equal(typeof p.连续修炼天数, 'number');
  });
});

test('reminders 资源可读且为合法 JSON', async () => {
  await withMcp(async ({ client }) => {
    await client.callTool({ name: 'add_person', arguments: { name: '资源对象' } });
    await client.callTool({ name: 'add_reminder', arguments: { personName: '资源对象', content: 'r' } });
    const res = await client.readResource({ uri: 'eqworker://reminders' });
    const parsed = JSON.parse(res.contents[0].text);
    assert.ok(Array.isArray(parsed));
    assert.equal(parsed.length, 1);
  });
});

/* 回归：MCP 进程常驻，落盘失败时写工具必须回滚内存。
   手法：让数据文件位置上放一个同名目录 → load 进入写保护、save 必败。
   修复前：add_person 报"保存失败"但内存已污染，list_persons 照样能看到人。 */
test('落盘失败时写工具回滚内存，不会出现"报错却添加成功"', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'eqw-mcp-ro-'));
  mkdirSync(join(dir, 'eq-worker.json')); // 数据文件位置 = 目录 → 写必失败
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(process.cwd(), 'dist-mcp/eq-worker-mcp.mjs')],
    env: { ...process.env, EQWORKER_DATA_DIR: dir },
    stderr: 'pipe'
  });
  const client = new Client({ name: 'eqw-test-ro', version: '1.0.0' });
  await client.connect(transport);
  try {
    const add = parse(await client.callTool({ name: 'add_person', arguments: { name: '污染测试' } }));
    assert.match(add, /保存失败/, '落盘失败应明确报错');
    const list = parse(await client.callTool({ name: 'list_persons', arguments: {} }));
    assert.ok(!list.includes('污染测试'), '内存必须回滚：报错后不应对外可见');
  } finally {
    await client.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

/* 回归：add_person 的标签上限必须与核心规范一致（10 个）。
   修复前 MCP 裁剪到 12，11 个标签的合法输入会让 save 校验必拒，
   用户得到一条"存储不可写"的误导性报错。 */
test('add_person 标签超过 10 个时按核心规范裁剪且添加成功', async () => {
  await withMcp(async ({ client }) => {
    const tags = Array.from({ length: 12 }, (_, i) => '标签' + (i + 1));
    const add = parseJson(await client.callTool({ name: 'add_person', arguments: { name: '标签上限', tags } }));
    assert.ok(add.ok, '12 个标签经裁剪后应能正常保存');
    assert.equal(add.已添加.tags.length, 10, '应裁剪到核心规范的 10 个');
  });
});
