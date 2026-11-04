import { describe, it, expect } from 'vitest';
import {
  computePerson,
  computeAll,
  computedFor,
  overallMetrics,
  buildActions,
  buildAlerts,
  ledgerTotals,
  ledgerInsights,
  healthRanking,
  personLedger,
  achievements,
  annualReport,
  monthInsights,
  giftAdvice,
  buildScripts,
  buildICS,
  upcomingDates,
  createEmptyState,
  uid,
  type AppState,
  type Person,
  type PersonalEvent,
  type EventType
} from '../src/index';

/**
 * 性能基准。
 *
 * 目的不是追求绝对速度，而是挡住**复杂度回归**——
 * 某个 PR 把 O(n) 改成 O(n²) 时，小数据集测不出来，真实用户攒到几百人就会卡死。
 * 这里用「大数据集 + 相对倍率」判断：数据翻 10 倍，耗时不应超过 20 倍。
 *
 * 阈值设得宽（机器性能差异大），但足以抓住数量级错误。
 */

function makeState(personCount: number, eventsPerPerson: number): AppState {
  const state = createEmptyState();
  const now = Date.now();
  const types: EventType[] = ['meal', 'talk', 'gift_give', 'gift_get', 'greeting', 'help_them'];
  const persons: Person[] = [];
  const events: PersonalEvent[] = [];
  for (let i = 0; i < personCount; i += 1) {
    const id = `p${i}`;
    persons.push({
      id,
      name: `联系人${i}`,
      identity: ['领导', '同事', '客户', '朋友', '家人'][i % 5],
      tags: [`tag${i % 7}`],
      birthday: `${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      anniversary: '',
      likes: '',
      taboos: '',
      note: '',
      adjust: 0,
      createdAt: now - (i % 365) * 86400000
    });
    for (let j = 0; j < eventsPerPerson; j += 1) {
      const type = types[(i + j) % types.length];
      events.push({
        id: `e${i}_${j}`,
        personId: id,
        type,
        title: `事件${j}`,
        time: now - ((i * 7 + j * 3) % 400) * 86400000,
        weight: 5,
        note: '',
        amount: (i + j) % 3 === 0 ? 200 + ((i * 13 + j * 7) % 8) * 100 : 0,
        dir: type === 'gift_get' ? 'in' : type === 'gift_give' ? 'out' : 'none',
        occasion: ['日常', '生日', '婚礼'][(i + j) % 3]
      });
    }
  }
  state.persons = persons;
  state.events = events;
  return state;
}

function time(fn: () => void, runs = 3): number {
  // 预热一次，避免 JIT 抖动污染第一次测量
  fn();
  let best = Infinity;
  for (let i = 0; i < runs; i += 1) {
    const t0 = performance.now();
    fn();
    const dt = performance.now() - t0;
    if (dt < best) best = dt;
  }
  return best;
}

it('computeAll 批量计算在 500 人 × 10 事件下保持线性', () => {
  const small = makeState(50, 10);
  const large = makeState(500, 10);

  const smallMs = time(() => { computeAll(small); });
  const largeMs = time(() => { computeAll(large); });

  const ratio = largeMs / Math.max(smallMs, 0.01);
  expect(ratio, `computeAll 增长过快：${smallMs.toFixed(1)}ms → ${largeMs.toFixed(1)}ms`).toBeLessThan(20);
  expect(largeMs, '500 人全量计算应在 1 秒内').toBeLessThan(1000);
});

it('单个 computePerson 每次自建索引，是正确的单次语义', () => {
  // 单独调用不做跨调用缓存是刻意设计：宁可重算，也不冒读到脏数据的风险
  // （原地 push/splice 会让「引用+长度」判断失效，这个 bug 历史上真的出现过）。
  // 批量场景请用 computeAll。
  const state = makeState(100, 5);
  const one = time(() => { computePerson(state, state.persons[0]); });
  expect(one, '单次 computePerson 应在 100ms 内').toBeLessThan(100);
});

it('computedFor 走缓存，重复调用不退化', () => {
  const state = makeState(100, 10);
  const ids = state.persons.map((p) => p.id);

  const first = time(() => { for (const id of ids) computedFor(state, id); });
  const second = time(() => { for (const id of ids) computedFor(state, id); });
  // 第二次应明显更快或持平（缓存命中）；给 3 倍宽容度防抖动
  expect(second, '缓存应生效').toBeLessThan(first * 3 + 5);
});

it('日报聚合（指标/行动/提醒）在 500 人规模下不超 1 秒', () => {
  const state = makeState(500, 8);
  const ms = time(() => {
    overallMetrics(state);
    buildActions(state, 8);
    buildAlerts(state);
  });
  expect(ms, '日报聚合应在 1 秒内').toBeLessThan(1000);
});

it('账本聚合在 500 人 × 20 事件下保持可用', () => {
  const state = makeState(500, 20);
  const ms = time(() => {
    ledgerTotals(state);
    ledgerInsights(state);
    for (const p of state.persons.slice(0, 100)) personLedger(state, p.id);
  });
  expect(ms, '账本聚合应在 2 秒内').toBeLessThan(2000);
});

it('关系体检排行在 1000 人规模下不超 3 秒', () => {
  const state = makeState(1000, 5);
  const ms = time(() => { healthRanking(state); });
  expect(ms, '1000 人体检应在 3 秒内').toBeLessThan(3000);
});

it('成就与年度报告在 500 人规模下不超 2 秒', () => {
  const state = makeState(500, 10);
  const ms = time(() => {
    achievements(state);
    annualReport(state);
    monthInsights(state);
  });
  expect(ms, '成就/年度应在 2 秒内').toBeLessThan(2000);
});

it('随礼参谋与话术生成是常数级，不随人数增长', () => {
  const small = makeState(10, 5);
  const large = makeState(1000, 5);
  const smallMs = time(() => {
    for (const p of small.persons) giftAdvice(small, p.id, '婚礼');
  }, 5);
  const largeMs = time(() => {
    for (const p of large.persons.slice(0, 10)) giftAdvice(large, p.id, '婚礼');
  }, 5);
  // 各测 10 次调用，人数差异不应带来数量级差别
  expect(largeMs, '随礼参谋不应随人数退化').toBeLessThan(smallMs * 8 + 20);

  const scriptMs = time(() => { buildScripts(large, 'refuse_loan', large.persons[0].id, ''); });
  expect(scriptMs, '话术生成应在 100ms 内').toBeLessThan(100);
});

it('ICS 导出在 500 人 × 10 事件下不超 1 秒', () => {
  const state = makeState(500, 10);
  const ms = time(() => { buildICS(state); });
  expect(ms, 'ICS 导出应在 1 秒内').toBeLessThan(1000);
});

it('upcomingDates 在 1000 人规模下不超 1 秒', () => {
  const state = makeState(1000, 3);
  const ms = time(() => { upcomingDates(state, 365); });
  expect(ms, '重要日子 1000 人应在 1 秒内').toBeLessThan(1000);
});

it('内存占用：1000 人 × 10 事件的数据结构不超过 100MB', () => {
  const state = makeState(1000, 10);
  const bytes = Buffer.byteLength(JSON.stringify(state), 'utf8');
  const mb = bytes / 1024 / 1024;
  expect(mb, '数据体积应低于 100MB').toBeLessThan(100);
});
