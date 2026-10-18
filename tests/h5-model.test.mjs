/* H5 唯一事实源 _app_dev.js 的模型单测
   —— 该文件同时驱动 Web / Android APK / Windows EXE 三端，此前完全没有测试覆盖。
   用 vm + 最小浏览器桩加载源码，剥离尾部 init()（它依赖真实 DOM）。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, '_app_dev.js');

function loadH5() {
  let src = fs.readFileSync(SRC, 'utf8');
  const idx = src.lastIndexOf('\ninit();');
  if (idx >= 0) src = src.slice(0, idx) + '\n';
  src += `
;globalThis.__h5 = { state, computePerson, computedFor, overallMetrics, getLevel, getWisdom,
  relationRead, daysUntil, sanitizeImport, esc, clamp, uid, EVENT_TYPES, invalidateCache, store,
  highlightKw };`;

  const el = () => ({
    innerHTML: '', textContent: '', value: '', style: {}, dataset: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild() {}, removeChild() {}, addEventListener() {}, removeEventListener() {},
    setAttribute() {}, getAttribute() { return null; }, focus() {}, click() {}, remove() {},
    querySelector() { return el(); }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { width: 300, height: 200, top: 0, left: 0 }; },
    insertAdjacentHTML() {}, closest() { return null; }, contains() { return false; }
  });

  const mem = new Map();
  const sandbox = {
    console,
    navigator: { userAgent: 'node-test' },
    location: { protocol: 'https:', hostname: 'example.com', href: 'https://example.com/' },
    localStorage: {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, String(v)),
      removeItem: (k) => mem.delete(k),
      clear: () => mem.clear()
    },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    setTimeout, clearTimeout, setInterval, clearInterval,
    requestAnimationFrame: (cb) => setTimeout(cb, 0),
    Blob: class {}, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    FileReader: class {},
    echarts: { init: () => ({ setOption() {}, resize() {}, dispose() {}, on() {} }) }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.document = {
    documentElement: el(), body: el(), head: el(),
    querySelector: () => el(), querySelectorAll: () => [],
    getElementById: () => el(), createElement: () => el(),
    addEventListener() {}, removeEventListener() {}
  };
  sandbox.addEventListener = () => {};
  sandbox.removeEventListener = () => {};

  const ctx = vm.createContext(sandbox);
  vm.runInContext(src, ctx, { filename: '_app_dev.js' });
  return sandbox.__h5;
}

const H = loadH5();
const DAY = 86400000;

function reset(persons = [], events = []) {
  H.state.persons = persons;
  H.state.events = events;
  H.state.reminders = [];
  H.state.progress = {};
  H.invalidateCache();
}

test('H5 源码可被加载并导出模型函数', () => {
  assert.equal(typeof H.computePerson, 'function');
  assert.equal(typeof H.overallMetrics, 'function');
  assert.equal(typeof H.sanitizeImport, 'function');
});

test('无事件时回到基准值 50/40/35/0', () => {
  const p = { id: 'p1', name: '张三', adjust: 0 };
  reset([p], []);
  const m = H.computePerson(p);
  assert.equal(m.heat, 50);
  assert.equal(m.trust, 40);
  assert.equal(m.intimacy, 35);
  assert.equal(m.debt, 0);
  assert.equal(m.eventCount, 0);
});

test('[P0 回归] 冲突/摩擦必须降低热度与信任，不能反向升温', () => {
  const p = { id: 'p1', name: '张三', adjust: 0 };
  reset([p], [{ id: 'e1', personId: 'p1', type: 'conflict', time: Date.now(), weight: -10 }]);
  const m = H.computePerson(p);
  assert.ok(m.heat < 50, `冲突应使热度下降，实际 heat=${m.heat}`);
  assert.ok(m.trust < 40, `冲突应使信任下降，实际 trust=${m.trust}`);
  assert.ok(m.intimacy < 35, `冲突应使亲密下降，实际 intimacy=${m.intimacy}`);
});

test('正向事件提升热度（饭局 weight=7 → +7）', () => {
  const p = { id: 'p1', name: '张三', adjust: 0 };
  reset([p], [{ id: 'e1', personId: 'p1', type: 'meal', time: Date.now(), weight: 7 }]);
  const m = H.computePerson(p);
  assert.equal(m.heat, 57);
});

test('90 天半衰期：效果减半', () => {
  const p = { id: 'p1', name: '张三', adjust: 0 };
  reset([p], [{ id: 'e1', personId: 'p1', type: 'meal', time: Date.now() - 90 * DAY, weight: 7 }]);
  const m = H.computePerson(p);
  assert.ok(Math.abs(m.heat - 53.5) < 0.6, `90 天后应约为 53.5，实际 ${m.heat}`);
});

test('[P0 回归] daysUntil：生日就是今天应返回 0', () => {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  assert.equal(H.daysUntil(`${mm}-${dd}`), 0);
});

test('daysUntil：明天生日返回 1', () => {
  const t = new Date(Date.now() + DAY);
  const mm = String(t.getMonth() + 1).padStart(2, '0');
  const dd = String(t.getDate()).padStart(2, '0');
  assert.equal(H.daysUntil(`${mm}-${dd}`), 1);
});

test('sanitizeImport：events 非数组不会导致崩溃', () => {
  const c = H.sanitizeImport({ persons: [{ name: 'A' }], events: 'not-an-array' });
  // 注意：vm 沙箱是独立 realm，数组原型不同，不能用 deepEqual([]) 比较，只校验长度与类型
  assert.ok(Array.isArray(c.events));
  assert.equal(c.events.length, 0);
});

test('sanitizeImport：progress.best 非数字被修正为 0（避免 NaN 白屏）', () => {
  const c = H.sanitizeImport({ persons: [{ name: 'A' }], progress: { s1: { best: 'oops', times: 3 } } });
  assert.equal(c.progress.s1.best, 0);
  assert.ok(Number.isFinite(c.progress.s1.best));
});

test('sanitizeImport：过滤无效人脉并补齐 id', () => {
  const c = H.sanitizeImport({ persons: [{ name: '有效' }, { name: '  ' }, null, { id: 'x' }] });
  assert.equal(c.persons.length, 1);
  assert.equal(c.persons[0].name, '有效');
  assert.ok(c.persons[0].id);
});

test('sanitizeImport：过滤缺少 type/time 的脏事件', () => {
  const c = H.sanitizeImport({
    persons: [{ name: 'A' }],
    events: [
      { id: 'e1', personId: 'A', type: 'meal', time: Date.now(), weight: 7 },
      { personId: 'A', time: Date.now() },          // 缺 type
      { personId: 'A', type: 'meal' },              // 缺 time
      { personId: 'A', type: 'meal', time: 0 }      // time 非法
    ]
  });
  assert.equal(c.events.length, 1);
  assert.equal(c.events[0].id, 'e1');
});

test('overallMetrics：空数据返回 null 而不是抛错/NaN', () => {
  reset([], []);
  assert.equal(H.overallMetrics(), null);
});

test('overallMetrics：有人脉时五项均在 0-100 且 index 为有限数', () => {
  const p = { id: 'p1', name: '张三', adjust: 0 };
  reset([p], [{ id: 'e1', personId: 'p1', type: 'meal', time: Date.now(), weight: 7 }]);
  const m = H.overallMetrics();
  assert.ok(m);
  for (const k of ['scale', 'heatAvg', 'freq', 'credit', 'wisdom', 'index']) {
    assert.ok(Number.isFinite(m[k]), `${k} 应为有限数，实际 ${m[k]}`);
    assert.ok(m[k] >= 0 && m[k] <= 100, `${k} 应在 0-100，实际 ${m[k]}`);
  }
});

test('getLevel：段位边界正确', () => {
  assert.equal(H.getLevel(0).cur.name, '人情小白');
  assert.equal(H.getLevel(14).cur.name, '人情小白');
  assert.equal(H.getLevel(15).cur.name, '略懂世故');
  assert.equal(H.getLevel(35).cur.name, '人情通达');
  assert.equal(H.getLevel(60).cur.name, '人情大师');
  assert.equal(H.getLevel(84).cur.name, '人情大师');
  assert.equal(H.getLevel(85).cur.name, '人情宗师');
  assert.equal(H.getLevel(70).pct, 40);
});

test('relationRead：debt=0 应显示清爽而非误报欠人情', () => {
  // relationRead 接收「人」对象（内部自行 computedFor(p.id)），无事件时 debt=0
  const p = { id: 'p1', name: '张三', adjust: 0 };
  reset([p], []);
  const s = H.relationRead(p);
  assert.ok(/清清爽爽/.test(String(s)), `实际输出：${s}`);
  assert.ok(!/反而欠着/.test(String(s)), `不应误报欠人情：${s}`);
});

test('esc：转义 HTML 特殊字符', () => {
  assert.equal(H.esc('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(H.esc('a & b'), 'a &amp; b');
});

test('highlightKw：正常关键词会被 <mark> 包裹', () => {
  const s = H.highlightKw('张三丰', '三');
  assert.ok(s.includes('<mark'), `应包含高亮标签，实际 ${s}`);
  assert.ok(s.includes('张') && s.includes('丰'), '其余文字应保留');
});

test('[回归] highlightKw：不得在 HTML 实体内部误匹配（搜 amp 不应命中 &）', () => {
  // 旧实现先 esc 再查找，"a & b" 转义成 "a &amp; b"，搜 amp 会命中实体内部
  const s = H.highlightKw('a & b', 'amp');
  assert.ok(!s.includes('<mark'), `不应产生高亮，实际 ${s}`);
});

test('highlightKw：含尖括号的文本先转义再高亮，不产生注入', () => {
  const s = H.highlightKw('<img src=x onerror=alert(1)>', 'img');
  assert.ok(!s.includes('<img'), `原始标签必须被转义，实际 ${s}`);
  assert.ok(s.includes('&lt;'), '应转义为 &lt;');
});
