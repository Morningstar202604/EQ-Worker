import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../EQ-Worker-小程序');

/** 与 mini-page-save.test.mjs 相同的加载器：小程序代码是 CJS，用 vm 注入 wx/Page。 */
function setup(initial = {}) {
  const storage = new Map(Object.entries(initial));
  const messages = [];
  const navigation = [];
  const clipboard = [];
  let page;
  const wx = {
    getStorageInfoSync: () => ({ keys: [...storage.keys()] }),
    getStorageSync: (k) => (storage.has(k) ? structuredClone(storage.get(k)) : ''),
    setStorageSync: (k, v) => { storage.set(k, structuredClone(v)); },
    removeStorageSync: (k) => { storage.delete(k); },
    showToast: (x) => messages.push(x.title),
    showModal: (x) => messages.push(x.content),
    setClipboardData: (o) => { clipboard.push(o.data); o.success?.(); },
    navigateTo: (o) => navigation.push(o.url),
    switchTab: (o) => navigation.push(o.url),
    navigateBack: () => navigation.push('back'),
    setNavigationBarTitle: () => {},
    redirectTo: () => {},
    vibrateShort: () => {}
  };
  const cache = new Map();
  const load = (file) => {
    file = path.resolve(file.endsWith('.js') ? file : `${file}.js`);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const fn = vm.runInThisContext(
      `(function(require,module,exports,wx,Page,App,setTimeout,clearTimeout){${fs.readFileSync(file, 'utf8')}\n})`,
      { filename: file }
    );
    fn((p) => load(path.resolve(path.dirname(file), p)), module, module.exports, wx, (p) => { page = p; }, () => {}, (f) => { f(); return 1; }, () => {});
    return module.exports;
  };
  const engine = load(path.join(root, 'utils/engine'));
  const open = (name) => {
    page = null;
    load(path.join(root, 'pages', name, name));
    const p = page;
    p.data = structuredClone(p.data);
    p.setData = (values, cb) => {
      for (const [key, value] of Object.entries(values)) {
        const parts = key.split('.');
        let obj = p.data;
        for (const part of parts.slice(0, -1)) obj = obj[part];
        obj[parts.at(-1)] = value;
      }
      if (typeof cb === 'function') cb.call(p);
    };
    return p;
  };
  return { engine, storage, messages, navigation, clipboard, open };
}

const seed = {
  schema: 4,
  persons: [
    { id: 'p1', name: '陈姐', identity: '客户', tags: [], birthday: '', anniversary: '', likes: '', taboos: '', note: '', adjust: 0, createdAt: 1700000000000 }
  ],
  events: [
    { id: 'e1', personId: 'p1', type: 'gift_get', title: '婚礼收礼', time: 1700000000000, weight: 4, note: '', amount: 800, dir: 'in', occasion: '婚礼' }
  ],
  reminders: [],
  progress: {},
  streak: { n: 0, last: '' }
};

test('随礼参谋按关系与场合给出三档金额，切换档位会重算', () => {
  const x = setup({ eqworker_mp_v1: seed });
  x.engine.load();
  const p = x.open('gift');
  p.onShow();

  assert.equal(p.data.hasData, true);
  assert.ok(p.data.advice, '应有金额建议');
  // 三档必须递增
  const num = (s) => Number(String(s).replace(/[^0-9.]/g, ''));
  assert.ok(num(p.data.advice.low) <= num(p.data.advice.mid));
  assert.ok(num(p.data.advice.mid) <= num(p.data.advice.high));
  assert.ok(p.data.advice.reasons.length > 0, '应说明计算依据');

  const standardMid = num(p.data.advice.mid);
  p.onTier({ currentTarget: { dataset: { k: 'generous' } } });
  const generousMid = num(p.data.advice.mid);
  assert.ok(generousMid > standardMid, '重视档应高于得体档');
});

test('随礼参谋无人脉时给出空态而不是报错', () => {
  const x = setup();
  x.engine.load();
  const p = x.open('gift');
  p.onShow();
  assert.equal(p.data.hasData, false);
  assert.equal(p.data.advice, null);
});

test('话术参谋覆盖全部场景并给出三种语气，可复制', () => {
  const x = setup({ eqworker_mp_v1: seed });
  x.engine.load();
  const p = x.open('script');
  p.onLoad();
  p.onShow();

  assert.ok(p.data.scenes.length >= 16, `场景应覆盖常见场景，实际 ${p.data.scenes.length}`);
  assert.ok(p.data.result, '应生成话术');
  assert.equal(p.data.result.variants.length, 3);
  assert.deepEqual(p.data.result.variants.map((v) => v.tone), ['稳妥版', '亲近版', '简短版']);
  for (const v of p.data.result.variants) assert.ok(v.text.trim().length > 0);

  p.copy({ currentTarget: { dataset: { text: p.data.result.variants[0].text } } });
  assert.equal(x.clipboard.length, 1);
  assert.equal(x.clipboard[0], p.data.result.variants[0].text);
});

test('话术参谋切换场景会换内容', () => {
  const x = setup({ eqworker_mp_v1: seed });
  x.engine.load();
  const p = x.open('script');
  p.onLoad();
  p.onShow();
  const first = p.data.result.variants[0].text;
  const firstLabel = p.data.result.sceneLabel;

  p.onSceneChange({ detail: { value: 3 } });
  assert.notEqual(p.data.result.sceneLabel, firstLabel);
  assert.notEqual(p.data.result.variants[0].text, first);
});

test('话术参谋可指定对象，话术带上称呼', () => {
  const x = setup({ eqworker_mp_v1: seed });
  x.engine.load();
  const p = x.open('script');
  p.onLoad();
  p.onShow();
  // 索引 0 是「不指定」，1 是第一位人脉
  p.onPersonChange({ detail: { value: 1 } });
  assert.equal(p.data.result.personName, '陈姐');
  assert.ok(p.data.result.variants.some((v) => v.text.includes('陈姐')), '话术应带称呼');
});
