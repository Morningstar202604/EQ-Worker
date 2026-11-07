import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 跨端数据兼容回归。
 *
 * 背景：2026-11-07 审计发现，网页版「导出备份」写出的是裸状态
 * `{ schema, persons, events, ... }`，而 CLI/桌面用的是键值包装
 * `{ eqworker_db_v1: "<json>" }`。文件适配器当时只收字符串值，
 * 裸格式的字段全是对象/数组，会被静默过滤成空数据——
 * 用户把网页备份放进数据目录后只会看到「还没有任何数据」。
 *
 * 这里用真实 CLI 进程验证，不直接 import TS 源。
 */

const root = fileURLToPath(new URL('..', import.meta.url));
const CLI = join(root, 'dist-cli/eqw.mjs');

const PERSON = {
  id: 'p1', name: '张叔', identity: '长辈', tags: [], birthday: '', anniversary: '',
  likes: '', taboos: '', note: '', adjust: 0, createdAt: 1
};
const EVENT = {
  id: 'e1', personId: 'p1', type: 'gift_get', title: '随礼',
  time: 1700000000000, weight: 4, note: '', amount: 800, dir: 'in', occasion: '婚礼'
};

function run(args, cwd) {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    cwd: cwd ?? root, encoding: 'utf8', timeout: 60_000
  });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function tmpDir() {
  return mkdtempSync(join(tmpdir(), 'eqw-cross-'));
}

test('网页导出的裸状态文件能被 CLI 直接读取', () => {
  const dir = tmpDir();
  try {
    writeFileSync(join(dir, 'eq-worker.json'), JSON.stringify({
      app: 'EQ-Worker', version: 3, schema: 5, exportedAt: 1,
      persons: [PERSON], events: [EVENT], reminders: [], progress: {}, streak: {}, settings: {}
    }), 'utf8');

    const r = run(['persons', '--data', dir]);
    assert.equal(r.code, 0, `CLI 应成功，实际输出：${r.out}`);
    assert.match(r.out, /张叔/, '应列出裸状态里的联系人');
    assert.doesNotMatch(r.out, /还没有任何数据/, '不应报告无数据');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('裸状态读入后写回，数据不丢（往返）', () => {
  const dir = tmpDir();
  try {
    writeFileSync(join(dir, 'eq-worker.json'), JSON.stringify({
      persons: [PERSON], events: [EVENT], reminders: [], progress: {}, streak: {}, settings: {}
    }), 'utf8');

    // 触发一次写入
    const w = run(['record', '--to', '张叔', '--type', 'meal', '--title', '审计往返', '--data', dir]);
    assert.equal(w.code, 0, `记录应成功：${w.out}`);

    // 再读回
    const r = run(['persons', '--data', dir]);
    assert.match(r.out, /张叔/);
    const raw = JSON.parse(readFileSync(join(dir, 'eq-worker.json'), 'utf8'));
    assert.ok('eqworker_db_v1' in raw, '写回后应是包装格式');
    const inner = JSON.parse(raw.eqworker_db_v1);
    assert.equal(inner.persons.length, 1, '人脉不应丢失');
    assert.equal(inner.events.length, 2, '原有 1 条 + 新增 1 条');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('包装格式（CLI 自身格式）仍然正常', () => {
  const dir = tmpDir();
  try {
    const inner = JSON.stringify({
      schema: 5, persons: [PERSON], events: [], reminders: [], progress: {},
      streak: {}, settings: {}, meta: { schema: 5, updatedAt: 1 }
    });
    writeFileSync(join(dir, 'eq-worker.json'), JSON.stringify({ eqworker_db_v1: inner }), 'utf8');
    const r = run(['persons', '--data', dir]);
    assert.equal(r.code, 0);
    assert.match(r.out, /张叔/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('--data 指定的目录会出现在「无数据」提示里', () => {
  const dir = tmpDir();
  try {
    const r = run(['persons', '--data', dir]);
    assert.equal(r.code, 1, '空目录应返回 1');
    assert.match(r.out, /还没有任何数据/);
    // 以前这里漏传 explicitDir，会显示默认的 AppData 路径，误导用户
    assert.ok(
      r.out.includes(dir) || r.out.includes('eq-worker.json'),
      `提示里应包含用户指定的目录，实际：${r.out}`
    );
    assert.doesNotMatch(r.out, /AppData.*Roaming.*EQ-Worker/, '不应显示默认目录');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('损坏文件仍被拒绝，不被裸格式兼容逻辑吞掉', () => {
  const dir = tmpDir();
  try {
    writeFileSync(join(dir, 'eq-worker.json'), '{broken', 'utf8');
    const r = run(['persons', '--data', dir]);
    assert.notEqual(r.code, 0, '损坏文件应报错退出');
    assert.match(r.out, /无法解析|格式异常|损坏/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
