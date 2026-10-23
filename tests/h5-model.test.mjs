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
  highlightKw, SCENARIOS, lsSet, lsGet, personLedger, ledgerTotals, giftAdvice, personHealth,
  buildActions, buildICS, buildScripts, SCRIPT_SCENES, SCRIPT_TONES, GIFT_TIERS, CITY_TIERS,
  OCCASIONS, eventDir, niceAmount, upcomingDates, fmtMoney, ledgerNetShort, ledgerNetLabel };`;

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
  H.state.settings = { giftTier: 'standard', cityTier: '二线' };
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

test('[P0 回归] 本地缓存损坏时 load() 仍得到干净状态', () => {
  H.lsSet('rqsg_radar_v2', JSON.stringify({
    persons: [{ name: 'A' }],
    events: [{ id: 'e1', personId: 'x', type: 'meal', time: 0 }],
    progress: { s1: { best: 'oops', times: 1 } }
  }));
  assert.equal(H.store.load(), true);
  assert.equal(H.state.events.length, 0);
  assert.ok(Number.isFinite(H.state.progress.s1.best));
  assert.equal(H.state.progress.s1.best, 0);
});

test('getWisdom：单题满分不会一次拉满（归一化到全部情景满分）', () => {
  H.state.progress = { wedding: { best: 100, times: 1 } };
  const w = H.getWisdom();
  assert.ok(w > 0 && w < 100, `单题满分应远小于 100，实际 ${w}`);
  // 全部情景满分才到 100
  const all = {};
  for (const sc of H.SCENARIOS) all[sc.id] = { best: 100, times: 1 };
  H.state.progress = all;
  assert.equal(H.getWisdom(), 100);
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

/* ---------------- EQ-Worker 3.0：账本 / 参谋 / 行动 / 日历 ---------------- */

test('sanitizeImport：保留金额、方向、场合与喜好忌讳', () => {
  const c = H.sanitizeImport({
    persons: [{ name: 'A', likes: '喝茶', taboos: '不喝酒', anniversary: '2020-05-20' }],
    events: [
      { personId: 'p', type: 'gift_give', time: Date.now(), amount: 600, dir: 'out', occasion: '生日' },
      { personId: 'p', type: 'gift_get', time: Date.now(), amount: 500, occasion: '节日' },
      { personId: 'p', type: 'meal', time: Date.now(), amount: 300 }
    ],
    settings: { giftTier: 'generous', cityTier: '一线' }
  });
  assert.equal(c.persons[0].anniversary, '05-20');
  assert.equal(c.persons[0].likes, '喝茶');
  assert.equal(c.events[0].amount, 600);
  assert.equal(c.events[0].dir, 'out');
  assert.equal(c.events[1].dir, 'in');
  assert.equal(c.events[2].dir, 'none');
  assert.equal(c.settings.giftTier, 'generous');
  assert.equal(c.settings.cityTier, '一线');
});

test('personLedger：收礼 - 送礼 = 净额，正数代表我欠对方', () => {
  const p = { id: 'p1', name: '张三', identity: '朋友', adjust: 0 };
  reset([p], [
    { id: 'e1', personId: 'p1', type: 'gift_give', time: Date.now(), weight: 4, amount: 500, dir: 'out' },
    { id: 'e2', personId: 'p1', type: 'gift_get', time: Date.now(), weight: 4, amount: 1200, dir: 'in' },
    { id: 'e3', personId: 'p1', type: 'meal', time: Date.now(), weight: 7, amount: 300, dir: 'none' }
  ]);
  const l = H.personLedger('p1');
  assert.equal(l.given, 500);
  assert.equal(l.received, 1200);
  assert.equal(l.net, 700);
  assert.equal(l.status, 'owe');
  const t = H.ledgerTotals();
  assert.equal(t.owe, 700);
  assert.equal(t.oweCount, 1);
});

test('eventDir：金额为 0 时永远不进入账本', () => {
  assert.equal(H.eventDir({ type: 'gift_get', amount: 0 }), 'none');
  assert.equal(H.eventDir({ type: 'gift_get', amount: 500 }), 'in');
  assert.equal(H.eventDir({ type: 'gift_give', amount: 500 }), 'out');
  assert.equal(H.eventDir({ type: 'meal', amount: 500 }), 'none');
});

test('niceAmount：礼金取常见整数', () => {
  assert.equal(H.niceAmount(873), 800);
  assert.equal(H.niceAmount(1030), 1000);
  assert.equal(H.niceAmount(1470), 1500);
  assert.equal(H.niceAmount(0), 0);
});

test('giftAdvice：领导婚礼得体档约 1000，三档递增', () => {
  const p = { id: 'p1', name: '王总', identity: '领导', adjust: 0 };
  reset([p], []);
  const a = H.giftAdvice('p1', '婚礼', { tier: 'standard', city: '二线' });
  assert.equal(a.mid, 1000);
  assert.ok(a.low < a.mid && a.mid < a.high, `区间应递增：${a.low}/${a.mid}/${a.high}`);
  assert.ok(a.reasons.length >= 2);
});

test('giftAdvice：对方曾给过 2000，还礼不低于 2000', () => {
  const p = { id: 'p1', name: '老张', identity: '朋友', adjust: 0 };
  reset([p], [
    { id: 'e1', personId: 'p1', type: 'gift_get', time: Date.now(), weight: 4, amount: 2000, dir: 'in', occasion: '婚礼' }
  ]);
  const a = H.giftAdvice('p1', '婚礼', { tier: 'simple', city: '三线' });
  assert.ok(a.mid >= 2000, `还礼应不低于对方给过的 2000，实际 ${a.mid}`);
  assert.ok(a.reasons.some(r => r.includes('2000')));
});

test('personHealth：分数在 0-100 且给出可执行建议', () => {
  const p = { id: 'p1', name: '张三', identity: '朋友', adjust: 0 };
  reset([p], []);
  const h = H.personHealth(p);
  assert.ok(h.score >= 0 && h.score <= 100);
  assert.ok(h.tips.length >= 1);
});

test('buildActions：生日提醒优先，且同一人只出一条', () => {
  const t = new Date(Date.now() + DAY);
  const mm = String(t.getMonth() + 1).padStart(2, '0');
  const dd = String(t.getDate()).padStart(2, '0');
  const p = { id: 'p1', name: '张三', identity: '朋友', birthday: `${mm}-${dd}`, adjust: 0 };
  reset([p], [
    { id: 'e1', personId: 'p1', type: 'help_them', time: Date.now() - 5 * DAY, weight: 6 }
  ]);
  const acts = H.buildActions(6);
  assert.ok(acts.length >= 1);
  assert.ok(acts.some(a => a.key === 'bday:p1'));
  assert.equal(acts.filter(a => a.personId === 'p1').length, 1);
  assert.ok(acts[0].primary.act);
});

test('buildActions：逾期待办排在最前', () => {
  const p = { id: 'p1', name: '张三', identity: '朋友', adjust: 0 };
  reset([p], []);
  H.state.reminders = [{ id: 'r1', personId: 'p1', content: '还人情', date: '2000-01-01', status: 'pending' }];
  const acts = H.buildActions(6);
  assert.equal(acts[0].key, 'todo:r1');
  assert.equal(acts[0].primary.act, 'quickDone');
});

test('buildScripts：三种版本都带称呼且不止一句', () => {
  const p = { id: 'p1', name: '陈姐', identity: '客户', likes: '咖啡', adjust: 0 };
  reset([p], [{ id: 'e1', personId: 'p1', type: 'meal', title: '项目庆功宴', time: Date.now(), weight: 7 }]);
  for (const sc of H.SCRIPT_SCENES) {
    const r = H.buildScripts(sc.id, 'p1', '');
    assert.equal(r.variants.length, 3, `${sc.id} 应有三种版本`);
    for (const v of r.variants) {
      assert.ok(v.text.includes('陈姐'), `${sc.id} ${v.tone} 应包含称呼`);
      assert.ok(v.text.length >= 8, `${sc.id} ${v.tone} 文案过短`);
    }
  }
});

test('buildICS：包含生日循环、待办与合法首尾', () => {
  const p = { id: 'p1', name: '张三', identity: '朋友', birthday: '01-02', anniversary: '05-20', adjust: 0 };
  reset([p], []);
  H.state.reminders = [{ id: 'r1', personId: 'p1', content: '请吃饭', date: '2026-12-01', status: 'pending' }];
  const s = H.buildICS();
  assert.ok(s.startsWith('BEGIN:VCALENDAR'));
  assert.ok(s.trim().endsWith('END:VCALENDAR'));
  assert.ok(s.includes('RRULE:FREQ=YEARLY'));
  assert.ok(s.includes('生日 · 张三'));
  assert.ok(s.includes('纪念日 · 张三'));
  assert.ok(s.includes('请吃饭'));
});

test('upcomingDates：生日与待办按天数升序', () => {
  const p = { id: 'p1', name: '张三', identity: '朋友', birthday: '01-02', adjust: 0 };
  reset([p], []);
  H.state.reminders = [{ id: 'r1', personId: 'p1', content: '请吃饭', date: '2026-12-01', status: 'pending' }];
  const d = H.upcomingDates(365);
  assert.ok(d.length >= 2);
  for (let i = 1; i < d.length; i++) assert.ok(d[i - 1].days <= d[i].days);
});

test('buildScripts：未指定对象时每个版本内部不混用您/你', () => {
  reset([], []);
  for (const sc of H.SCRIPT_SCENES) {
    const r = H.buildScripts(sc.id, '', '');
    for (const v of r.variants) {
      const hasNin = v.text.includes('您');
      const hasNi = v.text.includes('你');
      assert.ok(!(hasNin && hasNi), `${sc.id} ${v.tone} 混用您/你：${v.text}`);
    }
  }
});

test('ledgerNetShort：欠/应收/两清方向清晰', () => {
  assert.equal(H.ledgerNetShort(500), '欠 ¥500');
  assert.equal(H.ledgerNetShort(-500), '应收 ¥500');
  assert.equal(H.ledgerNetShort(0), '两清');
});
