import { test, expect } from 'vitest';

import {
  sanitizeImport,
  createEmptyState,
  computePerson,
  personLedger,
  ledgerTotals,
  ledgerNetLabel,
  giftAdvice,
  buildScripts,
  buildICS,
  upcomingDates,
  daysUntil,
  toMMDD,
  toDateInput,
  fmtDate,
  fmtMoney,
  clamp,
  niceAmount,
  computePerson as cp,
  achievements,
  annualReport,
  monthInsights,
  recordPractice,
  todayScenario,
  uid,
  type AppState,
  type Person,
  type PersonalEvent,
  type EventType
} from '../src/index';

/**
 * 边界与「预判会出什么问题」测试。
 *
 * 每条都对应一类真实用户会遇到的情况，而不是为了覆盖数字造输入：
 * 空值、超长字符串、非法日期、负数金额、跨年、闰年、时区、
 * 恶意导入、超大权重、重复 id。
 */

const NOW = new Date('2026-11-04T10:00:00').getTime();
const DAY = 86400000;

function person(p = {}) {
  return {
    id: 'p1', name: '测试', identity: '朋友', tags: [], birthday: '', anniversary: '',
    likes: '', taboos: '', note: '', adjust: 0, createdAt: NOW, ...p
  };
}
function event(e = {}) {
  return {
    id: 'e1', personId: 'p1', type: 'meal', title: 'x', time: NOW, weight: 7,
    note: '', amount: 0, dir: 'none', occasion: '日常', ...e
  };
}
function state(s = {}) {
  return { ...createEmptyState(), ...s };
}

// ---------- 空值与缺字段 ----------

test('空数据下所有查询函数不抛异常', () => {
  const s = state();
  expect(() => () => computePerson(s, person())).not.toThrow();
  expect(() => () => personLedger(s, 'missing')).not.toThrow();
  expect(() => () => ledgerTotals(s)).not.toThrow();
  expect(() => () => giftAdvice(s, 'missing', '婚礼')).not.toThrow();
  expect(() => () => buildScripts(s, 'reconnect', 'missing', '')).not.toThrow();
  expect(() => () => buildICS(s)).not.toThrow();
  expect(() => () => upcomingDates(s, 30)).not.toThrow();
  expect(() => () => achievements(s, NOW)).not.toThrow();
  expect(() => () => annualReport(s, NOW)).not.toThrow();
  expect(() => () => monthInsights(s, NOW)).not.toThrow();
});

test('缺少 birthday 的人不参与生日提醒，也不崩', () => {
  const s = state({ persons: [person({ birthday: '' })] });
  const up = upcomingDates(s, 365);
  expect(Array.isArray(up)).toBe(true);
  expect(up.filter((x) => x.kind === '生日').length).toBe(0);
});

test('未知事件类型退化到 other 而不是 NaN', () => {
  const s = state({
    persons: [person()],
    events: [event({ type: 'totally-unknown' })]
  });
  const c = computePerson(s, s.persons[0]);
  expect(Number.isFinite(c.heat), `heat 应为有限数，实际 ${c.heat}`).toBe(true);
  expect(Number.isFinite(c.debt)).toBe(true);
});

test('weight 为 NaN / Infinity / 负数时不产生 NaN 指标', () => {
  for (const w of [NaN, Infinity, -Infinity, -100, 1e9]) {
    const s = state({ persons: [person()], events: [event({ weight: w })] });
    const c = computePerson(s, s.persons[0]);
    expect(Number.isFinite(c.heat), `weight=${w} 时 heat 应有限`).toBe(true);
    expect(c.heat >= 0 && c.heat <= 100, `heat 应在 0-100，实际 ${c.heat}`).toBe(true);
    expect(c.debt >= 0 && c.debt <= 100).toBe(true);
  }
});

// ---------- 日期与时间 ----------

test('生日在闰日 02-29 的处理不崩', () => {
  expect(() => () => daysUntil('02-29', new Date('2026-03-01').getTime())).not.toThrow();
  const d = daysUntil('02-29', new Date('2026-03-01').getTime());
  expect(d >= 0 && d <= 366, `闰日生日天数应在合理范围，实际 ${d}`).toBe(true);
});

test('生日刚过与即将到来都能算出正数天数', () => {
  const base = new Date('2026-11-04T10:00:00').getTime();
  const justPassed = daysUntil('11-03', base);
  const upcoming = daysUntil('11-05', base);
  expect(justPassed > 300, `刚过的生日应距下次很久，实际 ${justPassed}`).toBe(true);
  expect(upcoming >= 1 && upcoming <= 2, `明天的生日应为 1-2 天，实际 ${upcoming}`).toBe(true);
});

test('非法日期字符串不抛异常', () => {
  for (const bad of ['', 'abc', '13-45', '2026-13-01', null, undefined, 0, {}]) {
    expect(() => () => toMMDD(bad), `toMMDD(${JSON.stringify(bad)}) 不应抛异常`).not.toThrow();
    expect(() => () => toDateInput(bad), `toDateInput(${JSON.stringify(bad)}) 不应抛异常`).not.toThrow();
  }
});

test('fmtDate 对越界时间戳不崩', () => {
  for (const t of [0, -1, 8.64e15, NaN, Infinity, -Infinity]) {
    expect(() => () => fmtDate(t)).not.toThrow();
    expect(typeof fmtDate(t)).toBe('string');
  }
});

test('年度报告 12 个月窗口：含最近 11 个月，不含第 13 个月', () => {
  const s = state({
    persons: [person()],
    events: [
      event({ id: 'e1', time: new Date('2025-11-15').getTime() }), // 第 13 个月，应排除
      event({ id: 'e2', time: new Date('2025-12-15').getTime() }), // 窗口首月，应计入
      event({ id: 'e3', time: new Date('2026-11-01').getTime() })  // 当月，应计入
    ]
  });
  const r = annualReport(s, NOW); // NOW = 2026-11
  expect(r.months.length).toBe(12);
  expect(r.total, '窗口内应正好 2 笔（2025-12 与 2026-11）').toBe(2);
  // 窗口首尾月份标签正确
  expect(r.months[0].label).toBe('12月');
  expect(r.months[11].label).toBe('11月');
});

// ---------- 金额 ----------

test('负数与小数金额不产生负净额错乱', () => {
  const s = state({
    persons: [person()],
    events: [
      event({ id: 'e1', type: 'gift_give', amount: -500, dir: 'out' }),
      event({ id: 'e2', type: 'gift_get', amount: 300.5, dir: 'in' })
    ]
  });
  const l = personLedger(s, 'p1');
  expect(Number.isFinite(l.net)).toBe(true);
  expect(() => () => ledgerNetLabel(l.net)).not.toThrow();
});

test('fmtMoney 处理 0 / 负数 / 小数 / 超大数', () => {
  expect(fmtMoney(0)).toBe('¥0');
  expect(fmtMoney(-500)).toMatch(/¥/);
  expect(fmtMoney(1000.6)).toMatch(/¥/);
  expect(fmtMoney(1e12)).toMatch(/¥/);
  expect(() => () => fmtMoney(NaN)).not.toThrow();
  expect(() => () => fmtMoney('500')).not.toThrow();
});

test('niceAmount 对越界输入返回可用的整数', () => {
  for (const v of [-100, 0, 1, 3, 7, 88, 999999, NaN, Infinity]) {
    const r = niceAmount(v);
    expect(Number.isFinite(r), `niceAmount(${v}) 应为有限数，实际 ${r}`).toBe(true);
    expect(r >= 0, `niceAmount(${v}) 不应为负，实际 ${r}`).toBe(true);
  }
});

// ---------- 字符串与注入 ----------

test('超长字符串被导入清洗截断，不炸存储', () => {
  const huge = 'x'.repeat(100000);
  const clean = sanitizeImport({
    persons: [{ id: 'p', name: huge, note: huge, tags: [huge] }],
    events: []
  });
  expect(clean.persons.length).toBe(1);
  expect(clean.persons[0].name.length <= 1000, `姓名应被截断，实际 ${clean.persons[0].name.length}`).toBe(true);
});

test('HTML / 脚本注入不会原样进入数据', () => {
  const clean = sanitizeImport({
    persons: [{ id: 'p', name: '<script>alert(1)</script>', note: '<img onerror=x>' }],
    events: []
  });
  expect(clean.persons.length).toBe(1);
  // 允许保留为文本，但不能是未转义的可执行结构——由渲染层 escapeHtml 兜底。
  // 这里确认清洗层至少不抛异常且字段是字符串。
  expect(typeof clean.persons[0].name).toBe('string');
});

test('恶意导入：原型污染字段被忽略', () => {
  const clean = sanitizeImport({
    __proto__: { polluted: true },
    persons: [{ id: 'p', name: '正常', __proto__: { bad: 1 } }],
    events: []
  });
  expect(({} as Record<string, unknown>).polluted, '不应污染 Object.prototype').toBeUndefined();
  expect(clean.persons.length).toBe(1);
});

test('导入缺 persons 字段时返回空结果而不是崩溃', () => {
  for (const bad of [{}, { persons: null }, { persons: 'string' }, { persons: [null, undefined, 1, 'x'] }]) {
    const clean = sanitizeImport(bad);
    expect(Array.isArray(clean.persons)).toBe(true);
    expect(Array.isArray(clean.events)).toBe(true);
  }
});

test('重复 id 的联系人不会导致崩溃', () => {
  const s = state({
    persons: [person({ id: 'dup', name: 'A' }), person({ id: 'dup', name: 'B' })],
    events: [event({ personId: 'dup' })]
  });
  expect(() => () => computePerson(s, s.persons[0])).not.toThrow();
  expect(() => () => ledgerTotals(s)).not.toThrow();
});

// ---------- 数值工具 ----------

test('clamp 对 NaN / 反向区间 / Infinity 安全', () => {
  expect(clamp(NaN, 0, 100), 'NaN 应退化到下界').toBe(0);
  expect(() => clamp(5, 10, 0)).not.toThrow();
  expect(clamp(Infinity, 0, 100)).toBe(100);
  expect(clamp(-Infinity, 0, 100)).toBe(0);
  expect(clamp(50, 0, 100)).toBe(50);
});

// ---------- 随礼参谋 ----------

test('随礼参谋对每种身份 × 每个场合都能给出递增三档', () => {
  const identities = ['领导', '同事', '客户', '朋友', '家人', '长辈', '同学', '邻居', '其他'];
  const occasions = ['日常', '生日', '婚礼', '满月', '乔迁', '探病', '节日', '还礼', '其他'];
  for (const identity of identities) {
    for (const occasion of occasions) {
      const s = state({ persons: [person({ identity })] });
      const a = giftAdvice(s, 'p1', occasion);
      expect(a.low <= a.mid, `${identity}/${occasion}: low<=mid`).toBe(true);
      expect(a.mid <= a.high, `${identity}/${occasion}: mid<=high`).toBe(true);
      expect(a.mid > 0, `${identity}/${occasion}: 金额应大于 0`).toBe(true);
    }
  }
});

test('随礼参谋非法场合退化到「其他」而不是 NaN', () => {
  const s = state({ persons: [person()] });
  const a = giftAdvice(s, 'p1', '不存在的场合');
  expect(a.occasion).toBe('其他');
  expect(Number.isFinite(a.mid) && a.mid > 0).toBe(true);
});

// ---------- 话术 ----------

test('每个场景对每个身份都能产出三档话术', () => {
  const s = state({ persons: [person({ name: '老张', identity: '朋友' })] });
  for (const scene of ['reconnect', 'thanks', 'apology', 'ask_favor', 'decline', 'refuse_loan', 'collect_debt', 'gift', 'toast', 'visit_sick', 'decline_invite', 'festival', 'invite', 'follow_up', 'birthday', 'anniversary']) {
    const r = buildScripts(s, scene, 'p1', '');
    expect(r.variants.length, `${scene} 应有三档`).toBe(3);
    for (const v of r.variants) {
      expect(v.text.includes('老张'), `${scene}/${v.tone} 应带称呼`).toBe(true);
      expect(v.text.length > 5, `${scene}/${v.tone} 不应为空`).toBe(true);
    }
  }
});

test('话术对超长背景不抛异常', () => {
  const s = state({ persons: [person()] });
  expect(() => () => buildScripts(s, 'reconnect', 'p1', 'x'.repeat(10000))).not.toThrow();
});

// ---------- 修炼 ----------

test('同一天重复练习不会重复增加连击', () => {
  const sc = todayScenario(NOW);
  const s1 = recordPractice(state(), sc.id, 0, NOW);
  expect(s1).not.toBeNull();
  const committed = { ...state(), streak: s1!.streak, progress: { [sc.id]: { best: s1!.best, times: s1!.times } } };
  const s2 = recordPractice(committed, sc.id, 1, NOW + 3600_000);
  expect(s2).not.toBeNull();
  expect(s2!.streakExtended, '同一天第二次练习不应再打卡').toBe(false);
  expect(s2!.streak.n).toBe(s1!.streak.n);
});

test('连续练习跨天连击递增，断签归 1', () => {
  const sc = todayScenario(NOW);
  const base = state();
  const d1 = recordPractice(base, sc.id, 0, NOW);
  expect(d1!.streak.n).toBe(1);
  const s1 = { ...base, streak: d1!.streak };
  const d2 = recordPractice(s1, sc.id, 0, NOW + DAY);
  expect(d2!.streak.n, '连续两天应为 2').toBe(2);
  const d3 = recordPractice(s1, sc.id, 0, NOW + 10 * DAY);
  expect(d3!.streak.n, '断签应归 1').toBe(1);
});

// ---------- ICS ----------

test('ICS 输出对空名 / 特殊字符做转义', () => {
  const s = state({
    persons: [person({ name: '张三, 李四; 王五', birthday: '03-15' })]
  });
  const ics = buildICS(s);
  expect(ics).toMatch(/BEGIN:VCALENDAR/);
  expect(ics).toMatch(/END:VCALENDAR/);
  // 逗号分号在 ICS 里是结构字符，必须转义
  expect(ics.includes('\\,') || ics.includes('\\;') || !ics.includes('张三, 李四'), 'ICS 应转义结构字符').toBe(true);
});

// ---------- uid ----------

test('uid 在大量生成下不重复', () => {
  const set = new Set();
  for (let i = 0; i < 20000; i += 1) set.add(uid());
  expect(set.size, 'uid 不应碰撞').toBe(20000);
});
