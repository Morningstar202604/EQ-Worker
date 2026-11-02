import {
  DIFFS,
  SCENARIOS,
  getLevel,
  getWisdom,
  todayScenario,
  type AppState,
  type Diff,
  type Scenario
} from '../../../packages/core/src/index';
import { escapeHtml } from './html';

export interface PracticeScenarioCard {
  id: string;
  tag: string;
  diff: Diff;
  title: string;
  scene: string;
  best: number;
  times: number;
}

export interface PracticeData {
  wisdom: number;
  levelName: string;
  levelDesc: string;
  levelNextName: string | null;
  levelGap: number;
  levelPct: number;
  streakDays: number;
  trainedToday: boolean;
  today: {
    id: string;
    tag: string;
    diff: Diff;
    weight: number;
    title: string;
    scene: string;
    choices: { t: string; s: number; r: string }[];
    tip: string;
  };
  filter: Diff | '全部';
  list: PracticeScenarioCard[];
  doneCount: number;
  totalCount: number;
}

export function scenarioCardHtml(card: PracticeScenarioCard): string {
  const chip = DIFFS[card.diff].chip;
  const foot = card.times > 0
    ? `已完成 ${card.times} 次 · 最高 ${card.best} 分`
    : '未挑战';
  return [
    `<button type="button" class="scenario-card" data-act="practice-open" data-id="${escapeHtml(card.id)}">`,
    `<div class="scenario-head">`,
    `<span class="chip">${escapeHtml(card.tag)}</span>`,
    `<span class="${escapeHtml(chip)}">${escapeHtml(card.diff)}</span>`,
    `</div>`,
    `<strong>${escapeHtml(card.title)}</strong>`,
    `<p class="muted small">${escapeHtml(card.scene)}</p>`,
    `<div class="scenario-foot"><span>${escapeHtml(foot)}</span><span>开始 →</span></div>`,
    `</button>`
  ].join('');
}

export function renderPractice(data: PracticeData): string {
  const diffChips = (['全部', '入门', '进阶', '高手'] as const)
    .map((d) => {
      const on = data.filter === d;
      return `<button type="button" class="chip-button${on ? ' on' : ''}" data-act="practice-filter" data-diff="${d}" aria-pressed="${on}">${d === '全部' ? '全部难度' : d + '题'}</button>`;
    })
    .join('');

  const levelLine = data.levelNextName
    ? `<p class="muted small">距「${escapeHtml(data.levelNextName)}」还差 ${data.levelGap} 分</p>
       <div class="meter" aria-hidden="true"><span style="width:${data.levelPct}%"></span></div>`
    : '<p class="muted small">已达最高段位，世事洞明</p>';

  const choices = data.today.choices
    .map((c, i) => {
      const letter = ['A', 'B', 'C', 'D'][i] ?? String(i + 1);
      return [
        `<button type="button" class="choice" data-act="practice-answer" data-id="${escapeHtml(data.today.id)}" data-index="${i}">`,
        `<span class="choice-key" aria-hidden="true">${letter}</span>`,
        `<span>${escapeHtml(c.t)}</span>`,
        `</button>`
      ].join('');
    })
    .join('');

  return [
    `<section class="view practice">`,
    `<header class="view-head">`,
    `<h1>人情修炼场</h1>`,
    `<p class="muted">在真实场景里练习分寸。每题满分 100，难度越高智慧值加成越大。</p>`,
    `</header>`,

    `<div class="card level-banner">`,
    `<div class="level-badge"><strong>${escapeHtml(data.levelName)}</strong><span>${data.wisdom} 智慧值</span></div>`,
    `<div class="level-body">`,
    `<p class="level-desc">${escapeHtml(data.levelDesc)}</p>`,
    `<p class="muted small">已连续修炼 ${data.streakDays} 天 · ${data.trainedToday ? '今日已练' : '今日未练'}</p>`,
    levelLine,
    `</div>`,
    `</div>`,

    `<div class="card today-scenario">`,
    `<div class="card-head">`,
    `<h2>今日情景 · ${escapeHtml(data.today.tag)}</h2>`,
    `<span class="${escapeHtml(DIFFS[data.today.diff].chip)}">${escapeHtml(data.today.diff)} ×${data.today.weight}</span>`,
    `</div>`,
    `<h3>${escapeHtml(data.today.title)}</h3>`,
    `<p class="muted">${escapeHtml(data.today.scene)}</p>`,
    `<p class="hint">如果是你，你会怎么应对？</p>`,
    `<div class="choices">${choices}</div>`,
    `</div>`,

    `<div class="card">`,
    `<div class="card-head">`,
    `<h2>情景库</h2>`,
    `<span class="muted small">已完成 ${data.doneCount} / ${data.totalCount} 题</span>`,
    `</div>`,
    `<div class="chip-row">${diffChips}</div>`,
    data.list.length
      ? `<div class="scenario-grid">${data.list.map(scenarioCardHtml).join('')}</div>`
      : `<div class="empty"><p>该难度下暂无情景</p></div>`,
    `</div>`,
    `</section>`
  ].join('\n');
}

/** 结果面板：答题后展示得分、点评与人情点拨。 */
export function renderPracticeResult(
  scenario: Scenario,
  choiceIndex: number,
  best: number,
  gained: number,
  streakDays: number,
  streakExtended: boolean
): string {
  const choice = scenario.choices[choiceIndex];
  const tone = choice.s >= 80 ? 'good' : choice.s >= 50 ? 'mid' : 'bad';
  const nextIdx = (SCENARIOS.findIndex((s) => s.id === scenario.id) + 1) % SCENARIOS.length;
  const nextId = SCENARIOS[nextIdx].id;
  return [
    `<p class="muted small">你的选择</p>`,
    `<p class="result-choice">${['A', 'B', 'C', 'D'][choiceIndex]}. ${escapeHtml(choice.t)}</p>`,
    `<div class="result-meta">`,
    `<span class="chip ${tone}">处世指数 ${choice.s}</span>`,
    `<span class="chip">${escapeHtml(scenario.diff)} ×${DIFFS[scenario.diff].w}</span>`,
    `<span class="muted small">最高纪录 ${best} 分</span>`,
    `</div>`,
    `<p class="result-gain">本局智慧值 +${gained}（含难度加成）</p>`,
    streakExtended
      ? `<p class="result-streak">连续修炼 ${streakDays} 天，继续保持</p>`
      : `<p class="muted small">今日已打卡 · 连续 ${streakDays} 天</p>`,
    `<div class="result-box ${tone}">${escapeHtml(choice.r)}</div>`,
    `<div class="card tip-card"><h3>人情点拨</h3><p class="muted">${escapeHtml(scenario.tip)}</p></div>`,
    `<div class="dialog-actions">`,
    `<button type="button" class="btn ghost" data-act="practice-open" data-id="${escapeHtml(nextId)}">再练一个</button>`,
    `<button type="button" class="btn primary" data-act="dialog-close">完成</button>`,
    `</div>`
  ].join('');
}

export function buildPracticeData(state: AppState, filter: Diff | '全部', now: number): PracticeData {
  const wisdom = getWisdom(state);
  const lv = getLevel(wisdom);
  const sk = state.streak || { n: 0, last: '' };
  const today = todayScenario(now);
  const todayStrLocal = new Date(now).toISOString().slice(0, 10);
  const trainedToday = sk.last === todayStrLocal;
  const doneCount = SCENARIOS.filter((s) => (state.progress[s.id]?.times ?? 0) > 0).length;

  const list: PracticeScenarioCard[] = SCENARIOS
    .filter((s) => s.id !== today.id)
    .filter((s) => filter === '全部' || s.diff === filter)
    .map((s) => ({
      id: s.id,
      tag: s.tag,
      diff: s.diff,
      title: s.title,
      scene: s.scene,
      best: state.progress[s.id]?.best ?? 0,
      times: state.progress[s.id]?.times ?? 0
    }));

  return {
    wisdom,
    levelName: lv.cur.name,
    levelDesc: lv.cur.desc,
    levelNextName: lv.nxt ? lv.nxt.name : null,
    levelGap: lv.nxt ? Math.max(0, lv.nxt.min - wisdom) : 0,
    levelPct: lv.pct,
    streakDays: sk.n,
    trainedToday,
    today: {
      id: today.id,
      tag: today.tag,
      diff: today.diff,
      weight: DIFFS[today.diff].w,
      title: today.title,
      scene: today.scene,
      choices: today.choices.map((c) => ({ t: c.t, s: c.s, r: c.r })),
      tip: today.tip
    },
    filter,
    list,
    doneCount,
    totalCount: SCENARIOS.length
  };
}
