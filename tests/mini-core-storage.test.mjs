import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundle = path.join(root, 'EQ-Worker-小程序/utils/core.bundle.js');
const sandbox = { module: { exports: {} }, console };
sandbox.exports = sandbox.module.exports;
vm.runInNewContext(fs.readFileSync(bundle, 'utf8'), sandbox, { filename: bundle });
const core = sandbox.module.exports;
const key = core.DB_KEY;
const backup = `${key}_migration_backup`;
const v4 = {
  schema: 4,
  persons: [{ id: 'p1', name: '张三', identity: '朋友', tags: ['同事'], birthday: '1990-05-20', anniversary: '2020-05-20', likes: '喝茶', taboos: '不喝酒', note: '老同学', adjust: 3, createdAt: 1700000000000 }],
  events: [{ id: 'e1', personId: 'p1', type: 'gift_get', title: '婚礼礼金', time: 1700000000000, weight: 4, note: '现金', amount: 1200, dir: 'in', occasion: '婚礼' }],
  reminders: [{ id: 'r1', personId: 'p1', content: '回礼', date: '2026-12-01', status: 'pending' }],
  progress: { wedding: { best: 90, times: 2 } },
  streak: { n: 5, last: '2026-10-30' },
  settings: { giftTier: 'generous', cityTier: '一线' }
};

for (const schema of [4, 5]) {
  test(`bundle schema ${schema} 特殊 progress 键可保存重载`, () => {
    const raw = `{"schema":${schema},"persons":[],"progress":{"__proto__":{"best":4,"times":2},"constructor":{"best":3,"times":1},"toString":{"best":2,"times":1}}}`;
    const adapter = core.createMemoryAdapter({ [key]: raw });
    const store = core.createStore(adapter);
    assert.equal(store.load(), true);
    assert.equal(store.save(), true);
    const saved = JSON.parse(adapter.getItem(key));
    assert.equal(Object.hasOwn(saved.progress, '__proto__'), true);
    assert.deepEqual(saved.progress.__proto__, { best: 4, times: 2 });
    assert.deepEqual(saved.progress.constructor, { best: 3, times: 1 });
    assert.deepEqual(saved.progress.toString, { best: 2, times: 1 });
    const reloaded = core.createStore(adapter);
    assert.equal(reloaded.load(), true);
    assert.deepEqual(JSON.parse(reloaded.exportJSON()).progress, saved.progress);
  });
}

for (const raw of ['{bad', '', 'null', '{"persons":{}}']) {
  test(`bundle 损坏数据禁止覆盖 ${JSON.stringify(raw)}`, () => {
    const adapter = core.createMemoryAdapter({ [key]: raw });
    const store = core.createStore(adapter);
    assert.equal(store.load(), false);
    assert.equal(store.isWriteProtected(), true);
    assert.equal(store.save(), false);
    assert.equal(adapter.getItem(key), raw);
  });
}

for (const meta of ['bad', null, [], { schema: 'five' }, { schema: 5, updatedAt: 'bad' }]) {
  test(`bundle 损坏 meta 禁止覆盖 ${JSON.stringify(meta)}`, () => {
    const raw = JSON.stringify({ schema: 5, persons: [], meta });
    const adapter = core.createMemoryAdapter({ [key]: raw });
    const store = core.createStore(adapter);
    store.load();
    assert.equal(store.isWriteProtected(), true);
    assert.equal(store.save(), false);
    assert.equal(adapter.getItem(key), raw);
  });
}

for (const data of [{ schema: 6, persons: [] }, { schema: 5, meta: { schema: 6 }, persons: [] }, { schema: 6, meta: { schema: 5 }, persons: [] }]) {
  test(`bundle 未来版本禁止覆盖 ${JSON.stringify(data)}`, () => {
    const raw = JSON.stringify(data);
    const adapter = core.createMemoryAdapter({ [key]: raw });
    const store = core.createStore(adapter);
    assert.equal(store.load(), true);
    assert.equal(store.isWriteProtected(), true);
    assert.equal(store.save(), false);
    assert.equal(adapter.getItem(key), raw);
  });
}

test('bundle v4 完整日期迁移时备份原文并在重启后可保存', () => {
  const raw = JSON.stringify(v4);
  const adapter = core.createMemoryAdapter({ [key]: raw });
  const store = core.createStore(adapter);
  assert.equal(store.load(), true);
  assert.equal(store.isWriteProtected(), false);
  assert.equal(store.getState().persons[0].birthday, '05-20');
  assert.equal(store.getState().persons[0].anniversary, '05-20');
  assert.equal(adapter.getItem(backup), raw);
  assert.equal(store.save(), true);
  const saved = JSON.parse(adapter.getItem(key));
  assert.equal(saved.schema, 5);
  assert.equal(saved.persons[0].name, '张三');
  assert.equal(saved.events[0].amount, 1200);
  const restarted = core.createStore(adapter);
  assert.equal(restarted.load(), true);
  assert.equal(restarted.getState().persons[0].birthday, '05-20');
  assert.equal(restarted.save(), true);
  assert.equal(adapter.getItem(backup), raw);
});

test('bundle 备份写入失败时保留原始数据', () => {
  const raw = JSON.stringify(v4);
  const adapter = core.createMemoryAdapter({ [key]: raw });
  const set = adapter.setItem;
  adapter.setItem = (k, value) => k === backup ? false : set(k, value);
  const store = core.createStore(adapter);
  assert.equal(store.load(), true);
  assert.equal(store.isWriteProtected(), true);
  assert.equal(store.save(), false);
  assert.equal(adapter.getItem(key), raw);
});

test('bundle 已有不同备份时保留旧备份，当前原文另存且主库可写', () => {
  /* 与 core 同步的设计取舍：旧备份不能覆盖，但也不能因此把用户锁死。 */
  const raw = JSON.stringify(v4);
  const adapter = core.createMemoryAdapter({ [key]: raw, [backup]: 'previous backup' });
  const keysBefore = new Set(adapter.keys());
  const store = core.createStore(adapter);
  assert.equal(store.load(), true);
  assert.equal(adapter.getItem(backup), 'previous backup');
  const added = adapter.keys().filter((k) => !keysBefore.has(k) && k.startsWith(backup));
  assert.ok(added.length > 0, '当前原文应另存为一个独立备份键');
  assert.equal(adapter.getItem(added[0]), raw);
  assert.equal(store.save(), true);
});
