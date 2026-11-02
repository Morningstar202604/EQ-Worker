import type { AppState, Scenario, ScenarioChoice } from './types';
import { DIFFS, SCENARIOS } from './constants';
import { fmtDate, todayStr, DAY } from './date';

export interface PracticeResult {
  /** 选项本身 */
  choice: ScenarioChoice;
  /** 难度加成后的本局得分（s × 难度权重） */
  gained: number;
  /** 该情景的历史最高分（含本次） */
  best: number;
  /** 本次之后该情景累计练习次数 */
  times: number;
  /** 本次之后的连续修炼天数 */
  streak: { n: number; last: string };
  /** 是否本次打卡让连击 +1（用于 UI 提示） */
  streakExtended: boolean;
}

export function findScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

/** 今日情景：按天轮换，保证同一天打开看到的是同一题。 */
export function todayScenario(now: number = Date.now()): Scenario {
  const idx = Math.floor(now / DAY) % SCENARIOS.length;
  return SCENARIOS[idx];
}

/**
 * 记录一次情景练习：打卡连击、更新最高分与次数。
 * 纯函数——返回新的 state，不改入参；调用方负责持久化与回滚。
 */
export function recordPractice(
  state: AppState,
  scenarioId: string,
  choiceIndex: number,
  now: number = Date.now()
): PracticeResult | null {
  const sc = findScenario(scenarioId);
  const choice = sc?.choices[choiceIndex];
  if (!sc || !choice) return null;

  const today = todayStr(now);
  const sk = state.streak || { n: 0, last: '' };
  let streakExtended = false;
  let streak = sk;
  if (sk.last !== today) {
    const yesterday = fmtDate(now - DAY);
    streak = { n: sk.last === yesterday ? sk.n + 1 : 1, last: today };
    streakExtended = true;
  }

  const prev = state.progress[sc.id] || { best: 0, times: 0 };
  const best = Math.max(prev.best, choice.s);
  const gained = Math.round(choice.s * DIFFS[sc.diff].w);

  return {
    choice,
    gained,
    best,
    times: prev.times + 1,
    streak,
    streakExtended
  };
}

/**
 * 把练习结果写回 state（纯函数）。与 recordPractice 配套使用：
 * 先 record 拿结果用于展示，确认后再 commit 落库。
 */
export function commitPractice(state: AppState, result: PracticeResult, scenarioId: string): AppState {
  return {
    ...state,
    streak: result.streak,
    progress: {
      ...state.progress,
      [scenarioId]: { best: result.best, times: result.times }
    }
  };
}
