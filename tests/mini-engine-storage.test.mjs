import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const enginePath = new URL('../EQ-Worker-小程序/utils/engine.js', import.meta.url);
const bundlePath = new URL('../EQ-Worker-小程序/utils/core.bundle.js', import.meta.url);
const bundleModule = { exports: {} };
vm.runInThisContext(`(function(module, exports) { ${fs.readFileSync(bundlePath, 'utf8')}\n})`)(bundleModule, bundleModule.exports);
const engineFactory = vm.runInThisContext(`(function(require, module, exports, wx) { ${fs.readFileSync(enginePath, 'utf8')}\n})`);
const key = 'eqworker_mp_v1';
const legacy = 'rqsg_radar_v2';
const backup = `${key}_migration_backup`;
const v4 = { schema: 4, persons: [{ id: 'p1', name: '张三', birthday: '1990-05-20', anniversary: '2020-05-20' }], events: [] };

function setup(initial = {}, failures = {}) {
  const storage = new Map(Object.entries(initial).map(([k, v]) => [k, structuredClone(v)]));
  const toasts = [];
  const wx = {
    getStorageInfoSync() { if (failures.info) throw Error('info failed'); return { keys: [...storage.keys()] }; },
    getStorageSync(k) { if (failures.read === k) throw Error('read failed'); return storage.has(k) ? structuredClone(storage.get(k)) : ''; },
    setStorageSync(k, v) { if (failures.write === k) throw Error('write failed'); storage.set(k, structuredClone(v)); },
    showToast(v) { toasts.push(v); }
  };
  const module = { exports: {} };
  engineFactory(() => bundleModule.exports, module, module.exports, wx);
  return { engine: module.exports, storage, toasts };
}

for (const raw of ['{bad', '', 'null', '{"persons":{}}', { persons: 'bad' }, { schema: 5, persons: [] }, { schema: 4, persons: [{ id: 'p', name: 'A', extra: 'keep' }] }]) {
  test(`损坏或有损数据不可覆盖 ${JSON.stringify(raw)}`, () => {
    const { engine, storage } = setup({ [key]: raw });
    engine.load();
    const result = engine.save();
    assert.deepEqual(storage.get(key), raw);
    assert.equal(result, false);
  });
}

test('主键损坏不回退旧键覆盖，读取异常也写保护', () => {
  for (const fail of [false, true]) {
    const { engine, storage } = setup({ [key]: '{bad', [legacy]: { persons: [] } }, fail ? { read: key } : {});
    engine.load();
    assert.equal(engine.save(), false);
    assert.equal(storage.get(key), '{bad');
  }
});

for (const raw of [JSON.stringify(v4), v4]) {
  test(`v4 日期迁移备份原始${typeof raw}并可重启保存`, () => {
    const { engine, storage } = setup({ [key]: raw });
    assert.equal(engine.load().persons[0].birthday, '05-20');
    assert.deepEqual(storage.get(backup), raw);
    assert.equal(engine.save(), true);
    const restarted = setup(Object.fromEntries(storage));
    assert.equal(restarted.engine.load().persons[0].anniversary, '05-20');
    assert.equal(restarted.engine.save(), true);
    assert.deepEqual(restarted.storage.get(backup), raw);
  });
}

test('迁移备份写失败或已有不同备份时只读且保留原始数据', () => {
  for (const existing of [false, true]) {
    const raw = JSON.stringify(v4);
    const { engine, storage } = setup({ [key]: raw, ...(existing ? { [backup]: 'old' } : {}) }, existing ? {} : { write: backup });
    assert.equal(engine.load().persons[0].birthday, '05-20');
    assert.equal(engine.save(), false);
    assert.equal(storage.get(key), raw);
    if (existing) assert.equal(storage.get(backup), 'old');
  }
});

test('备份读取失败和存储信息读取失败均禁止覆盖', () => {
  for (const failures of [{ read: backup }, { info: true }]) {
    const raw = JSON.stringify(v4);
    const { engine, storage } = setup({ [key]: raw, [backup]: raw }, failures);
    engine.load();
    assert.equal(engine.save(), false);
    assert.equal(storage.get(key), raw);
    assert.equal(storage.get(backup), raw);
  }
});

test('旧键日期迁移保留原始数据与备份', () => {
  const raw = JSON.stringify(v4);
  const { engine, storage } = setup({ [legacy]: raw });
  assert.equal(engine.load().persons[0].birthday, '05-20');
  assert.equal(storage.get(backup), raw);
  assert.equal(engine.save(), true);
  assert.equal(storage.get(legacy), raw);
});

test('普通写入失败保留缓存数据与内存修改，并可重试', () => {
  const failures = {};
  const { engine, storage, toasts } = setup({ [key]: { schema: 4, persons: [] } }, failures);
  engine.load().persons.push({ id: 'p1', name: '李四' });
  failures.write = key;
  assert.equal(engine.save(), false);
  assert.deepEqual(storage.get(key), { schema: 4, persons: [] });
  assert.equal(engine.getState().persons[0].name, '李四');
  assert.equal(toasts.length, 1);
  failures.write = null;
  assert.equal(engine.save(), true);
  assert.equal(storage.get(key).persons[0].name, '李四');
});

test('空存储及正常数据允许保存，旧键可读取', () => {
  let env = setup();
  assert.deepEqual(env.engine.load().persons, []);
  assert.equal(env.engine.save(), true);
  env = setup({ [legacy]: { schema: 4, persons: [{ id: 'p', name: '甲' }] } });
  assert.equal(env.engine.load().persons[0].name, '甲');
  assert.equal(env.engine.save(), true);
  assert.equal(env.storage.get(key).persons[0].name, '甲');
});
