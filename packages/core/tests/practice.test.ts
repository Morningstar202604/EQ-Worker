import { describe, it, expect } from 'vitest';
import {
  recordPractice,
  commitPractice,
  todayScenario,
  findScenario,
  createEmptyState,
  SCENARIOS,
  DIFFS,
  type AppState
} from '../src/index';

const DAY = 86400000;
const T0 = new Date('2026-11-02T10:00:00').getTime();

function state(s: Partial<AppState> = {}): AppState {
  return { ...createEmptyState(), ...s };
}

describe('recordPractice', () => {
  it('首次练习打卡，连击为 1', () => {
    const sc = SCENARIOS[0];
    const r = recordPractice(state(), sc.id, 1, T0)!;
    expect(r).not.toBeNull();
    expect(r.streak).toEqual({ n: 1, last: '2026-11-02' });
    expect(r.streakExtended).toBe(true);
    expect(r.times).toBe(1);
  });

  it('同一天再练不重复打卡', () => {
    const sc = SCENARIOS[0];
    const s = state({ streak: { n: 3, last: '2026-11-02' } });
    const r = recordPractice(s, sc.id, 0, T0)!;
    expect(r.streak).toEqual({ n: 3, last: '2026-11-02' });
    expect(r.streakExtended).toBe(false);
  });

  it('昨天练过今天续上，连击 +1', () => {
    const sc = SCENARIOS[0];
    const s = state({ streak: { n: 3, last: '2026-11-01' } });
    const r = recordPractice(s, sc.id, 0, T0)!;
    expect(r.streak.n).toBe(4);
    expect(r.streakExtended).toBe(true);
  });

  it('断签后连击重置为 1', () => {
    const sc = SCENARIOS[0];
    const s = state({ streak: { n: 9, last: '2026-10-20' } });
    const r = recordPractice(s, sc.id, 0, T0)!;
    expect(r.streak.n).toBe(1);
  });

  it('得分含难度加成，且只升不降最高分', () => {
    const hard = SCENARIOS.find((s) => s.diff === '高手')!;
    const best = Math.max(...hard.choices.map((c) => c.s));
    const idx = hard.choices.findIndex((c) => c.s === best);
    const r = recordPractice(state(), hard.id, idx, T0)!;
    expect(r.gained).toBe(Math.round(best * DIFFS['高手'].w));
    expect(r.best).toBe(best);

    // 再练一次拿低分，最高分不应被拉低
    const lowIdx = hard.choices.findIndex((c) => c.s === Math.min(...hard.choices.map((x) => x.s)));
    const s2 = commitPractice(state(), r, hard.id);
    const r2 = recordPractice(s2, hard.id, lowIdx, T0)!;
    expect(r2.best).toBe(best);
    expect(r2.times).toBe(2);
  });

  it('非法情景或越界选项返回 null', () => {
    expect(recordPractice(state(), 'no-such-id', 0, T0)).toBeNull();
    const sc = SCENARIOS[0];
    expect(recordPractice(state(), sc.id, 99, T0)).toBeNull();
  });
});

describe('commitPractice', () => {
  it('写回 state 且不改入参', () => {
    const sc = SCENARIOS[0];
    const before = state();
    const r = recordPractice(before, sc.id, 1, T0)!;
    const after = commitPractice(before, r, sc.id);
    expect(before.progress[sc.id]).toBeUndefined();
    expect(after.progress[sc.id]).toEqual({ best: r.best, times: 1 });
    expect(after.streak).toEqual(r.streak);
    expect(after).not.toBe(before);
  });
});

describe('todayScenario', () => {
  it('同一天返回同一题，跨天轮换', () => {
    const a = todayScenario(T0);
    const b = todayScenario(T0 + 3600_000);
    expect(a.id).toBe(b.id);
    const c = todayScenario(T0 + DAY);
    expect(c.id).not.toBe(a.id);
  });

  it('返回值一定在情景库中', () => {
    expect(findScenario(todayScenario(T0).id)).toBeDefined();
  });
});
