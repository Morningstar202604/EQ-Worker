// EQ-Worker · 小程序 core bundle 与 legacy _app_dev.js 一致性验收
// 使用同一组 fixture 分别调用 core.bundle.js 与原始 _app_dev.js，
// 断言 computePerson / personLedger / giftAdvice / buildActions 输出完全一致。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOW = new Date(2026, 9, 31, 12, 0, 0).getTime();
const DAY = 86400000;

/* ---------- core.bundle.js（CommonJS，vm 加载绕开根 package.json 的 type: module） ---------- */
function loadCoreBundle() {
  const bundlePath = path.join(ROOT, 'EQ-Worker-小程序/utils/core.bundle.js');
  const code = fs.readFileSync(bundlePath, 'utf8');
  const sandbox = { module: { exports: {} }, exports: {}, console, Date, Math, JSON, Array, Object, String, Number, Boolean, Error, RegExp, Map, Set, Promise };
  sandbox.exports = sandbox.module.exports;
  vm.runInContext(code, vm.createContext(sandbox), { filename: bundlePath });
  return sandbox.module.exports;
}

/* ---------- legacy _app_dev.js（复用 core 测试同款最小浏览器桩） ---------- */
function fixedDate(now) {
  const RealDate = Date;
  return new Proxy(RealDate, {
    construct(target, args) {
      return Reflect.construct(target, args.length ? args : [now]);
    },
    get(target, prop, receiver) {
      if (prop === 'now') return () => now;
      return Reflect.get(target, prop, receiver);
    }
  });
}

function stubEl() {
  const el = () => ({
    innerHTML: '', textContent: '', value: '', style: {}, dataset: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild() {}, removeChild() {}, addEventListener() {}, removeEventListener() {},
    setAttribute() {}, getAttribute() { return null; }, focus() {}, click() {}, remove() {},
    querySelector() { return el(); }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { width: 300, height: 200, top: 0, left: 0 }; },
    insertAdjacentHTML() {}, closest() { return null; }, contains() { return false; }
  });
  return el();
}

function loadLegacy() {
  let src = fs.readFileSync(path.join(ROOT, '_app_dev.js'), 'utf8');
  const idx = src.lastIndexOf('\ninit();');
  if (idx >= 0) src = src.slice(0, idx) + '\n';
  src += `
;globalThis.__h5 = { state, computePerson, personLedger, giftAdvice, buildActions, invalidateCache };`;

  const mem = new Map();
  const sandbox = {
    console,
    Date: fixedDate(NOW),
    navigator: { userAgent: 'node-test' },
    location: { protocol: 'https:', hostname: 'example.com', href: 'https://example.com/' },
    localStorage: {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, String(v)),
      removeItem: (k) => mem.delete(k),
      clear: () => mem.clear()
    },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    requestAnimationFrame: (cb) => setTimeout(cb, 0),
    Blob: class {},
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    FileReader: class {},
    echarts: { init: () => ({ setOption() {}, resize() {}, dispose() {}, on() {} }) }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.document = {
    documentElement: stubEl(), body: stubEl(), head: stubEl(),
    querySelector: () => stubEl(), querySelectorAll: () => [],
    getElementById: () => stubEl(), createElement: () => stubEl(),
    addEventListener() {}, removeEventListener() {}
  };
  sandbox.addEventListener = () => {};
  sandbox.removeEventListener = () => {};
  vm.runInContext(src, vm.createContext(sandbox), { filename: '_app_dev.js' });
  return sandbox.__h5;
}

/* ---------- fixtures ---------- */
function person(id, name, extra = {}) {
  return {
    id, name, identity: '朋友', tags: [], birthday: '', anniversary: '',
    likes: '', taboos: '', note: '', adjust: 0, createdAt: NOW, ...extra
  };
}

function event(id, personId, type, daysAgo, extra = {}) {
  return {
    id, personId, type, title: '', time: NOW - daysAgo * DAY, weight: 7,
    note: '', amount: 0, dir: 'none', occasion: '', ...extra
  };
}

const FIXTURES = [
  {
    name: '空数据',
    persons: [], events: []
  },
  {
    name: '单事件 + 生日',
    persons: [person('p1', '张三', { adjust: 2, birthday: '10-31', likes: '喝茶' })],
    events: [event('e1', 'p1', 'meal', 0, { weight: 7, title: '火锅' })]
  },
  {
    name: '冲突负权重 + 久未往来',
    persons: [
      person('p1', '李四', { identity: '领导', birthday: '11-02' }),
      person('p2', '王五', { identity: '客户', adjust: -3 })
    ],
    events: [
      event('e1', 'p1', 'conflict', 3, { weight: -10 }),
      event('e2', 'p1', 'talk', 10, { weight: 5 }),
      event('e3', 'p2', 'help_them', 80, { weight: 6 })
    ]
  },
  {
    name: '账本混合 + 待办',
    persons: [
      person('p1', '赵六', { identity: '领导' }),
      person('p2', '钱七', { identity: '客户', adjust: -2 }),
      person('p3', '孙八', { identity: '家人' })
    ],
    events: [
      event('e1', 'p1', 'gift_get', 5, { weight: 4, amount: 1200, dir: 'in', occasion: '婚礼' }),
      event('e2', 'p1', 'gift_give', 2, { weight: 4, amount: 500, dir: 'out', occasion: '生日' }),
      event('e3', 'p2', 'gift_give', 30, { weight: 4, amount: 800, dir: 'out', occasion: '乔迁' }),
      event('e4', 'p2', 'money', 12, { weight: 5, amount: 2000, dir: 'in', occasion: '其他' }),
      event('e5', 'p3', 'gift_get', 60, { weight: 4, amount: 600, dir: 'in', occasion: '节日' }),
      event('e6', 'p3', 'meal', 1, { weight: 7, amount: 300, dir: 'none', occasion: '日常' }),
      event('e7', 'p3', 'conflict', 20, { weight: -10 })
    ],
    reminders: [{ id: 'r1', personId: 'p1', content: '还礼', date: '2000-01-01', status: 'pending' }],
    progress: { wedding: { best: 90, times: 3 }, toast: { best: 70, times: 1 } }
  }
];

function coreState(core, f) {
  const s = core.createEmptyState();
  s.persons = f.persons;
  s.events = f.events;
  s.reminders = f.reminders ?? [];
  s.progress = f.progress ?? {};
  return s;
}

function legacyState(H, f) {
  H.state.persons = f.persons;
  H.state.events = f.events;
  H.state.reminders = f.reminders ?? [];
  H.state.progress = f.progress ?? {};
  H.state.settings = { giftTier: 'standard', cityTier: '二线' };
  H.invalidateCache();
}

function plain(v) {
  return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
}

const core = loadCoreBundle();
const legacy = loadLegacy();

for (const f of FIXTURES) {
  test(`mini core parity：${f.name}`, () => {
    legacyState(legacy, f);
    const S = coreState(core, f);
    const probes = f.persons.length ? f.persons : [person('probe', '探针')];

    for (const p of probes) {
      assert.deepEqual(plain(core.computePerson(S, p, NOW)), plain(legacy.computePerson(p)), `computePerson(${p.id})`);
      assert.deepEqual(plain(core.personLedger(S, p.id)), plain(legacy.personLedger(p.id)), `personLedger(${p.id})`);
      for (const [tier, city] of [['standard', '二线'], ['generous', '一线'], ['simple', '三线']]) {
        assert.deepEqual(
          plain(core.giftAdvice(S, p.id, '婚礼', { tier, city })),
          plain(legacy.giftAdvice(p.id, '婚礼', { tier, city })),
          `giftAdvice(${p.id}, ${tier}, ${city})`
        );
      }
    }

    for (const limit of [undefined, 3, 10]) {
      assert.deepEqual(plain(core.buildActions(S, limit, NOW)), plain(legacy.buildActions(limit)), `buildActions(${limit})`);
    }
  });
}

test('mini core bundle 不依赖 node 内置模块 / process', () => {
  const code = fs.readFileSync(path.join(ROOT, 'EQ-Worker-小程序/utils/core.bundle.js'), 'utf8');
  assert.equal(/\brequire\(['"](?:node:)?(?:fs|path|process|os|child_process)['"]\)/.test(code), false);
  assert.equal(/\bprocess\.(?:env|argv|platform)\b/.test(code), false);
});
