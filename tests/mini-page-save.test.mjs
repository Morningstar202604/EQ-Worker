import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../EQ-Worker-小程序');
function setup(initial = {}, fail = true) {
  const storage = new Map(Object.entries(initial));
  const messages = [], navigation = [];
  let failWrite = fail, page, app;
  const wx = {
    getStorageInfoSync: () => ({ keys: [...storage.keys()] }),
    getStorageSync: k => storage.has(k) ? structuredClone(storage.get(k)) : '',
    setStorageSync(k, v) { if (failWrite) throw Error('disk'); storage.set(k, structuredClone(v)); },
    showToast: x => messages.push(x.title), showModal: x => messages.push(x.content),
    navigateBack: () => navigation.push('back'), setNavigationBarTitle() {}, redirectTo() {}
  };
  const cache = new Map();
  const load = file => {
    file = path.resolve(file.endsWith('.js') ? file : file + '.js');
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const fn = vm.runInThisContext(`(function(require,module,exports,wx,Page,App,setTimeout,clearTimeout){${fs.readFileSync(file, 'utf8')}\n})`, { filename: file });
    fn(p => load(path.resolve(path.dirname(file), p)), module, module.exports, wx, p => { page = p; }, a => { app = a; }, f => { f(); return 1; }, () => {});
    return module.exports;
  };
  const engine = load(path.join(root, 'utils/engine'));
  const open = name => {
    page = null; load(path.join(root, 'pages', name, name));
    const p = page; p.data = structuredClone(p.data);
    p.setData = values => { for (const [key, value] of Object.entries(values)) { const parts = key.split('.'); let obj = p.data; for (const part of parts.slice(0, -1)) obj = obj[part]; obj[parts.at(-1)] = value; } };
    return p;
  };
  return { engine, storage, messages, navigation, open, start() { load(path.join(root, 'app')); app.onLaunch(); }, allow() { failWrite = false; } };
}
const seed = { schema: 4, persons: [{ id: 'p', name: '甲' }], events: [{ id: 'e', personId: 'p', type: 'meal', title: '旧记录', time: 1700000000000, weight: 7, note: '' }], reminders: [{ id: 'r', personId: 'p', content: '旧提醒', date: '', status: 'pending' }] };
const event = id => ({ currentTarget: { dataset: { id, rid: id } } });

test('记录写失败不清表单、不伪报成功，重试仅保存一条', () => {
  const x = setup({ eqworker_mp_v1: seed }); x.engine.load(); const p = x.open('record'); p.onShow();
  p.setData({ title: '新记录', note: '草稿' }); p.submit();
  assert.equal(p.data.title, '新记录'); assert.equal(p.data.note, '草稿');
  assert.equal(x.engine.getState().events.length, 1); assert.notEqual(p.data._toast.msg, '已记录');
  x.allow(); p.submit(); assert.equal(x.engine.getState().events.length, 2); assert.equal(p.data.title, '');
});

test('提醒完成和删除失败回滚', () => {
  const x = setup({ eqworker_mp_v1: seed }); x.engine.load(); const p = x.open('me');
  p.quickDone(event('r')); assert.equal(x.engine.getState().reminders[0].status, 'pending'); assert.notEqual(p.data._toast.msg, '已完成');
  p.delReminder(event('r')); p.onModalConfirm(); assert.equal(x.engine.getState().reminders.length, 1);
});

test('添加提醒失败保留弹窗输入并允许重试', () => {
  const x = setup({ eqworker_mp_v1: seed }); x.engine.load(); const p = x.open('detail'); p.data.id = 'p';
  p.addReminder(); p.onModalInput({ detail: { value: '提醒草稿' } }); p.onModalConfirm();
  assert.equal(p.data._modal.show, true); assert.equal(p.data._modal.inputVal, '提醒草稿'); assert.equal(x.engine.getState().reminders.length, 1);
  x.allow(); p.onModalConfirm(); assert.equal(x.engine.getState().reminders.length, 2);
});

test('删除人脉失败保留数据且不退出', () => {
  const x = setup({ eqworker_mp_v1: seed }); x.engine.load(); const p = x.open('detail'); p.data.id = 'p'; p.delPerson(); p.onModalConfirm();
  assert.equal(x.engine.getState().persons.length, 1); assert.equal(x.engine.getState().events.length, 1); assert.deepEqual(x.navigation, []);
});

test('导入失败保留原状态和文本，成功后关闭', () => {
  const x = setup({ eqworker_mp_v1: seed }); x.engine.load(); const p = x.open('me');
  const txt = JSON.stringify({ persons: [{ id: 'new', name: '乙' }] }); p.setData({ showImport: true, importText: txt }); p.doImport();
  assert.equal(p.data.showImport, true); assert.equal(p.data.importText, txt); assert.equal(x.engine.getState().persons[0].name, '甲');
  x.allow(); p.doImport(); assert.equal(p.data.showImport, false); assert.equal(x.engine.getState().persons[0].name, '乙');
});

test('记录撤销和删除失败不改变事件或撤销标记', () => {
  const x = setup({ eqworker_mp_v1: { ...seed, lastEventId: 'e' } }); x.engine.load(); const p = x.open('record');
  p.undo(); assert.equal(x.engine.getState().lastEventId, 'e'); assert.equal(x.engine.getState().events.length, 1);
  p.delEvent(event('e')); p.onModalConfirm(); assert.equal(x.engine.getState().events.length, 1);
});

test('人脉编辑、新建、微调与记录删除失败保持原状态和表单', () => {
  const x = setup({ eqworker_mp_v1: seed }); x.engine.load(); const p = x.open('detail'); p.data.id = 'p';
  p.adjust({ currentTarget: { dataset: { d: 1 } } }); assert.equal(x.engine.getState().persons[0].adjust, 0);
  p.delEvent(event('e')); p.onModalConfirm(); assert.equal(x.engine.getState().events.length, 1);
  p.data.mode = 'edit'; p.data.form = { name: '新名字', identityIdx: 3, birthday: '', tags: '', note: '' }; p.savePerson();
  assert.equal(p.data.mode, 'edit'); assert.equal(p.data.form.name, '新名字'); assert.equal(x.engine.getState().persons[0].name, '甲');
  p.data.mode = 'add'; p.savePerson(); assert.equal(x.engine.getState().persons.length, 1); assert.deepEqual(x.navigation, []);
});

test('首页提醒及清空失败保留原数据', () => {
  const x = setup({ eqworker_mp_v1: seed }); x.engine.load();
  x.open('index').quickDone(event('r')); assert.equal(x.engine.getState().reminders[0].status, 'pending');
  const p = x.open('me'); p.clearAll(); p.onModalConfirm(); assert.equal(x.engine.getState().persons.length, 1); assert.equal(x.engine.getState().events.length, 1);
});

test('我的页面提醒草稿失败可重试', () => {
  const x = setup({ eqworker_mp_v1: seed }); x.engine.load(); const p = x.open('me');
  p.pickPerson(event('p')); p.onModalInput({ detail: { value: '我的草稿' } }); p.onModalConfirm();
  assert.equal(p.data._modal.show, true); assert.equal(p.data._modal.inputVal, '我的草稿'); assert.equal(x.engine.getState().reminders.length, 1);
  x.allow(); p.onModalConfirm(); assert.equal(x.engine.getState().reminders.length, 2);
});

test('训练保存失败回滚并保留选择', () => {
  const x = setup({ eqworker_mp_v1: seed }); x.engine.load(); const p = x.open('scenario'); p.onLoad({}); p.choose({ currentTarget: { dataset: { i: 0 } } });
  const before = structuredClone(x.engine.getState().progress); p.confirm();
  assert.deepEqual(x.engine.getState().progress, before); assert.equal(p.data.pick, 0); assert.equal(p.data._modal.show, false);
});

test('损坏存储启动时有明确可见警告', () => {
  const x = setup({ eqworker_mp_v1: '{bad' }); x.start(); assert.ok(x.messages.some(v => /数据|存储/.test(v) && /保护|损坏|异常/.test(v)));
});
