import { describe, it, expect } from 'vitest';
import {
  achievements,
  monthInsights,
  annualReport,
  createEmptyState,
  type AppState,
  type Person,
  type PersonalEvent
} from '../src/index';

const T0 = new Date('2026-11-02T10:00:00').getTime();
const DAY = 86400000;

function person(p: Partial<Person> = {}): Person {
  return {
    id: 'p1',
    name: '测试人',
    identity: '朋友',
    tags: [],
    birthday: '',
    anniversary: '',
    likes: '',
    taboos: '',
    note: '',
    adjust: 0,
    createdAt: T0 - 30 * DAY,
    ...p
  };
}

function ev(e: Partial<PersonalEvent> = {}): PersonalEvent {
  return {
    id: 'e1',
    personId: 'p1',
    type: 'gift_give',
    title: '送了一份礼',
    time: T0,
    weight: 1,
    amount: 500,
    dir: 'out',
    occasion: '生日',
    note: '',
    ...e
  };
}

function state(s: Partial<AppState> = {}): AppState {
  const base = createEmptyState();
  return { ...base, ...s };
}

describe('achievements', () => {
  it('返回 13 个徽章定义，空状态只可能达成与数据量无关的项', () => {
    const list = achievements(state(), T0);
    expect(list).toHaveLength(13);
    for (const a of list) {
      expect(a.cur).toBeLessThanOrEqual(a.need);
      expect(a.done).toBe(a.cur >= a.need);
    }
  });

  it('记录与人脉数量解锁对应徽章', () => {
    const s = state({
      persons: [person(), person({ id: 'p2' }), person({ id: 'p3' }), person({ id: 'p4' }), person({ id: 'p5' })],
      events: Array.from({ length: 50 }, (_, i) => ev({ id: 'e' + i, time: T0 - i * DAY }))
    });
    const list = achievements(s, T0);
    expect(list.find((a) => a.t === '破冰者')!.done).toBe(true);
    expect(list.find((a) => a.t === '初结人脉')!.done).toBe(true);
    expect(list.find((a) => a.t === '圈子成型')!.done).toBe(false);
    expect(list.find((a) => a.t === '日积月累')!.done).toBe(true);
  });

  it('连续修炼天数解锁连击徽章', () => {
    const s = state({ streak: { n: 7, last: '2026-11-02' } });
    const list = achievements(s, T0);
    expect(list.find((a) => a.t === '三日不辍')!.done).toBe(true);
    expect(list.find((a) => a.t === '七日成习')!.done).toBe(true);
    expect(list.find((a) => a.t === '七日成习')!.cur).toBe(7);
  });

  it('情景题完成数解锁修炼徽章', () => {
    const s = state({
      progress: {
        s1: { best: 80, times: 2 },
        s2: { best: 60, times: 1 },
        s3: { best: 40, times: 1 }
      }
    });
    const list = achievements(s, T0);
    expect(list.find((a) => a.t === '初入修炼')!.cur).toBe(3);
    expect(list.find((a) => a.t === '初入修炼')!.done).toBe(false);
  });

  it('所有人脉账目两清且至少一位人脉时达成「两不相欠」', () => {
    const s = state({ persons: [person()] });
    const list = achievements(s, T0);
    expect(list.find((a) => a.t === '两不相欠')!.done).toBe(true);
  });

  it('有欠债时「两不相欠」不达成', () => {
    const s = state({
      persons: [person()],
      events: [ev({ type: 'gift_get', weight: 40 })]
    });
    const list = achievements(s, T0);
    expect(list.find((a) => a.t === '两不相欠')!.done).toBe(false);
  });

  it('生日徽章按有生日的联系人数量计算', () => {
    const s = state({
      persons: [person({ birthday: '03-15' }), person({ id: 'p2', birthday: '09-01' }), person({ id: 'p3' })]
    });
    const list = achievements(s, T0);
    expect(list.find((a) => a.t === '细心人')!.cur).toBe(2);
    expect(list.find((a) => a.t === '细心人')!.done).toBe(false);
  });
});

describe('monthInsights', () => {
  it('统计本月往来、走动最勤的人、新增人脉', () => {
    const s = state({
      persons: [person(), person({ id: 'p2', createdAt: T0 })],
      events: [
        ev({ id: 'e1', personId: 'p1', time: T0 }),
        ev({ id: 'e2', personId: 'p1', time: T0 - 1000 }),
        ev({ id: 'e3', personId: 'p2', time: T0 }),
        ev({ id: 'e4', personId: 'p1', time: T0 - 40 * DAY })
      ]
    });
    const m = monthInsights(s, T0);
    expect(m.count).toBe(3);
    expect(m.top[0]).toMatchObject({ id: 'p1', count: 2 });
    expect(m.newPersons).toBe(1);
  });

  it('人情债前三按金额降序', () => {
    const s = state({
      persons: [person(), person({ id: 'p2' })],
      events: [
        ev({ id: 'e1', personId: 'p1', type: 'gift_get', weight: 40 }),
        ev({ id: 'e2', personId: 'p2', type: 'gift_get', weight: 80 })
      ]
    });
    const m = monthInsights(s, T0);
    expect(m.topDebts[0].name).toBe('测试人');
    expect(m.topDebts[0].debt).toBeGreaterThan(0);
  });
});

describe('annualReport', () => {
  it('返回 12 个月的滚动窗口与总笔数', () => {
    const s = state({
      persons: [person()],
      events: [ev({ id: 'e1', time: T0 }), ev({ id: 'e2', time: T0 - 20 * DAY })]
    });
    const r = annualReport(s, T0);
    expect(r.months).toHaveLength(12);
    expect(r.total).toBe(2);
    expect(r.bestMonths).toContain('11月');
    expect(r.topPersons[0]).toMatchObject({ id: 'p1', count: 2 });
  });

  it('空数据关键词为白纸提示，且不会除零', () => {
    const r = annualReport(state(), T0);
    expect(r.total).toBe(0);
    expect(r.peak).toBe(1);
    expect(r.keywords[0]).toContain('白纸');
  });

  it('有欠债时关键词包含欠债提醒', () => {
    const s = state({
      persons: [person()],
      events: [ev({ type: 'gift_get', weight: 40 })]
    });
    const r = annualReport(s, T0);
    expect(r.keywords.some((k) => k.includes('记得还'))).toBe(true);
  });
});
