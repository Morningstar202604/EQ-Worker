// EQ-Worker · 引擎单元测试（node --test）
// 零依赖，使用 Node.js 原生 test runner + assert/strict
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const engine = require('../test-fixtures/mp-engine-stub.cjs');

const { computePerson, solarToLunar, clamp, avg, esc } = engine;

// 辅助：重置引擎状态，避免测试间污染
function resetState() {
  const state = engine.getState();
  state.persons = [];
  state.events = [];
  state.reminders = [];
  state.progress = {};
  state.streak = { n: 0, last: '' };
  state.lastEventId = null;
}

// ── computePerson ──────────────────────────────────────────────

test('computePerson: 空 events 返回默认值', () => {
  resetState();
  const p = { id: 'p1', name: '测试', adjust: 0 };
  const m = computePerson(p);
  assert.equal(m.heat, 50);
  assert.equal(m.trust, 40);
  assert.equal(m.intimacy, 35);
  assert.equal(m.debt, 0);
  assert.equal(m.lastDays, null);
  assert.equal(m.eventCount, 0);
});

test('computePerson: 加一条事件后 heat 增加', () => {
  resetState();
  const p = { id: 'p1', name: '测试', adjust: 0 };
  const m1 = computePerson(p);
  const heatBefore = m1.heat;

  engine.getState().events.push({
    id: 'e1', personId: 'p1', type: 'help_them', time: Date.now(), weight: 1
  });
  const m2 = computePerson(p);
  assert.ok(m2.heat > heatBefore, `heat 应增加：${heatBefore} → ${m2.heat}`);
  assert.equal(m2.eventCount, 1);
});

test('computePerson: 每次调用返回独立对象引用（引擎无缓存）', () => {
  resetState();
  const p = { id: 'p1', name: '测试', adjust: 0 };
  const a = computePerson(p);
  const b = computePerson(p);
  assert.notEqual(a, b);
  assert.deepEqual(a, b);
});

test('computePerson: 冲突事件（人情值 -10）降低 heat', () => {
  resetState();
  const p = { id: 'p1', name: '测试', adjust: 0 };
  /* 人情值就是这次往来对热度的实际增量：冲突的基准是 -10。
     旧用例写 weight:1 是按「绝对值归一化」的 bug 行为写的，已随修复更正。 */
  engine.getState().events.push({
    id: 'e1', personId: 'p1', type: 'conflict', time: Date.now(), weight: -10
  });
  const m = computePerson(p);
  assert.ok(m.heat < 50, `冲突应降低 heat：${m.heat}`);
});

test('[P0 回归] 冲突事件（weight=-10）必须降低热度，不能反向升温', () => {
  resetState();
  const p = { id: 'p1', name: '测试', adjust: 0 };
  engine.getState().events.push({
    id: 'e1', personId: 'p1', type: 'conflict', time: Date.now(), weight: -10
  });
  const m = computePerson(p);
  assert.ok(m.heat < 50, `冲突应降低 heat，实际 ${m.heat}`);
});

test('[P0 回归] daysUntil：生日就是今天应返回 0（不能跳到 365）', () => {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  assert.equal(engine.daysUntil(`${mm}-${dd}`), 0);
});

test('sanitizeImport：events 非数组不崩溃，progress.best 非数字被修正', () => {
  const c = engine.sanitizeImport({
    persons: [{ name: 'A' }],
    events: 'not-an-array',
    progress: { s1: { best: 'oops', times: 3 } }
  });
  assert.ok(Array.isArray(c.events));
  assert.equal(c.events.length, 0);
  assert.equal(c.progress.s1.best, 0);
  assert.ok(Number.isFinite(c.progress.s1.best));
});

test('sanitizeImport：缺 weight 的事件按类型基准补齐（冲突为负）', () => {
  const c = engine.sanitizeImport({
    persons: [{ name: 'A' }],
    events: [{ id: 'e1', personId: 'p', type: 'conflict', time: Date.now() }]
  });
  assert.equal(c.events[0].weight, -10);
});

// ── solarToLunar ────────────────────────────────────────────────

test('solarToLunar: 2024-02-10 春节 → 农历正月初一', () => {
  const d = new Date(2024, 1, 10);
  const lunar = solarToLunar(d);
  assert.equal(lunar.m, 1);
  assert.equal(lunar.d, 1);
  assert.equal(lunar.leap, false);
});

test('solarToLunar: 返回字段完整性', () => {
  const d = new Date(2024, 0, 1);
  const lunar = solarToLunar(d);
  assert.ok('y' in lunar && 'm' in lunar && 'd' in lunar && 'leap' in lunar);
  assert.ok(typeof lunar.y === 'number' && lunar.y > 1900);
  assert.ok(lunar.m >= 1 && lunar.m <= 12);
  assert.ok(lunar.d >= 1 && lunar.d <= 30);
});

// ── clamp ───────────────────────────────────────────────────────

test('clamp: 基本断言', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(0, 0, 100), 0);
  assert.equal(clamp(100, 0, 100), 100);
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(11, 0, 10), 10);
  assert.equal(clamp(50, 0, 100), 50);
});

// ── avg ─────────────────────────────────────────────────────────

test('avg: 基本断言', () => {
  assert.equal(avg([]), 0);
  assert.equal(avg([1, 2, 3]), 2);
  assert.equal(avg([10]), 10);
  assert.equal(avg([0, 0, 0]), 0);
  assert.equal(avg([-1, 1]), 0);
  assert.equal(avg([1, 2]), 1.5);
});

// ── esc ─────────────────────────────────────────────────────────

test('esc: HTML 实体转义', () => {
  assert.equal(esc('<script>'), '&lt;script&gt;');
  assert.equal(esc('a&b'), 'a&amp;b');
  assert.equal(esc('"hello"'), '&quot;hello&quot;');
  assert.equal(esc("it's"), 'it&#39;s');
  assert.equal(esc('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
});

test('esc: null/undefined/空值', () => {
  assert.equal(esc(null), '');
  assert.equal(esc(undefined), '');
  assert.equal(esc(''), '');
  assert.equal(esc(0), '0');
});
