import { findScenario, type AppState, type Diff } from '../../../packages/core/src/index';
import type { StudioStore } from '../state';
import {
  buildPracticeData,
  renderPractice,
  renderPracticeResult,
  type PracticeData
} from '../views/practice';

export function practiceData(studio: StudioStore): PracticeData {
  return buildPracticeData(studio.getState(), studio.getPracticeFilter(), studio.now());
}

export function renderPracticeView(studio: StudioStore): string {
  return renderPractice(practiceData(studio));
}

export function renderPracticeResultView(
  studio: StudioStore,
  scenarioId: string,
  choiceIndex: number,
  best: number,
  gained: number,
  streakDays: number,
  streakExtended: boolean
): string {
  const sc = findScenario(scenarioId);
  if (!sc) return '<p class="error">情景不存在</p>';
  return renderPracticeResult(sc, choiceIndex, best, gained, streakDays, streakExtended);
}

export type { PracticeData, Diff, AppState };
