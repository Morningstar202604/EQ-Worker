import { DAY, daysUntil, todayStr, upcomingFestival } from './date';
import { DIFFS, EVENT_TYPES, LEVELS, SCENARIOS } from './constants';
import { avg, clamp, esc } from './sanitize';
import type {
  AlertItem,
  AppState,
  ComputedPerson,
  LevelResult,
  Person
} from './types';

export const PLACEHOLDER = {
  help_them: '对方帮我协调了资源',
  help_me: '帮对方搬了家',
  meal: '周五晚上一起吃了顿火锅',
  gift_get: '收到了中秋礼盒',
  gift_give: '给对方送了生日礼物',
  money: '借了5000，说好下月还',
  talk: '深夜聊了聊近况和打算',
  greeting: '春节发了祝福',
  conflict: '因为项目分工起了争执',
  other: '周末一起逛了趟街'
} as const;

export const PLACEHOLDERS = PLACEHOLDER;

export function computePerson(state: AppState, p: Person, now: number = Date.now()): ComputedPerson {
  const evs = state.events.filter((e) => e.personId === p.id);
  let heat = 50;
  let trust = 40;
  let intim = 35;
  let debt = 0;
  let lastTs: number | null = null;
  for (const ev of evs) {
    const days = (now - ev.time) / DAY;
    const ratio = Math.pow(0.5, days / 90);
    const t = EVENT_TYPES[ev.type] || EVENT_TYPES.other;
    const denom = Number.isFinite(t.dHeat) && t.dHeat !== 0 ? t.dHeat : 1;
    const w = Number.isFinite(ev.weight) ? ev.weight / denom : 1;
    heat += t.dHeat * ratio * w;
    trust += t.dTrust * ratio * w;
    intim += t.dIntimacy * ratio * w;
    debt += t.dDebt * ratio * w;
    if (!lastTs || ev.time > lastTs) lastTs = ev.time;
  }
  const lastDays = lastTs ? Math.max(0, Math.floor((now - lastTs) / DAY)) : null;
  const activity = lastDays === null ? 5 : clamp(100 - lastDays / 1.2, 5, 100);
  return {
    heat: clamp(heat + (p.adjust || 0), 0, 100),
    trust: clamp(trust, 0, 100),
    intimacy: clamp(intim, 0, 100),
    activity: Math.round(activity),
    debt: clamp(debt, 0, 100),
    lastDays,
    eventCount: evs.length
  };
}

export function computedFor(state: AppState, personId: string, now: number = Date.now()): ComputedPerson | null {
  const p = state.persons.find((x) => x.id === personId);
  return p ? computePerson(state, p, now) : null;
}

export function wisdomFull(): number {
  return SCENARIOS.reduce((sum, sc) => sum + 100 * DIFFS[sc.diff].w, 0);
}

export function getWisdom(state: AppState): number {
  let s = 0;
  for (const k in state.progress) {
    const sc = SCENARIOS.find((x) => x.id === k);
    const w = DIFFS[sc ? sc.diff : '入门'].w;
    s += state.progress[k].best * w;
  }
  const full = wisdomFull();
  if (!(full > 0)) return 0;
  return clamp(Math.round((s / full) * 100), 0, 100);
}

export function getLevel(w: number): LevelResult {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (w >= l.min) cur = l;
  const nxt = LEVELS.find((l) => l.min > cur.min);
  return { cur, nxt, pct: nxt ? Math.round(((w - cur.min) / (nxt.min - cur.min)) * 100) : 100 };
}

export function overallMetrics(state: AppState, now: number = Date.now()): {
  scale: number;
  heatAvg: number;
  freq: number;
  credit: number;
  wisdom: number;
  index: number;
} | null {
  const n = state.persons.length;
  if (!n) return null;
  const pms = state.persons.map((p) => computePerson(state, p, now));
  const scale = clamp(n * 12, 5, 100);
  const heatAvg = avg(pms.map((p) => p.heat));
  const n30 = state.events.filter((e) => now - e.time < 30 * DAY).length;
  const freq = Math.round(100 * (1 - Math.exp(-n30 / 6)));
  const credit = clamp(100 - avg(pms.map((p) => p.debt)), 0, 100);
  const wisdom = getWisdom(state);
  const index = Math.round(0.2 * scale + 0.25 * heatAvg + 0.2 * freq + 0.2 * credit + 0.15 * wisdom);
  return { scale, heatAvg, freq, credit, wisdom, index };
}

export function buildAlerts(state: AppState, now: number = Date.now()): AlertItem[] {
  const out: AlertItem[] = [];
  const fst = upcomingFestival(now);
  if (fst) {
    out.push({
      ic: 'fest',
      cls: 'blue',
      personId: '',
      text: `${fst.days === 0 ? '今天是' : fst.days + ' 天后是'}${fst.n}，记得给重要的人送个祝福、走动一下`
    });
  }
  for (const p of state.persons) {
    const m = computePerson(state, p, now);
    if (m.debt >= 20) {
      out.push({
        ic: 'debt',
        cls: 'amber',
        personId: p.id,
        text: `<b>${esc(p.name)}</b>：你欠着人情债（${Math.round(m.debt)}），建议近期请顿饭或回个礼`
      });
    }
    if (m.lastDays !== null && m.lastDays >= 60) {
      out.push({
        ic: 'stale',
        cls: 'red',
        personId: p.id,
        text: `<b>${esc(p.name)}</b>：已 ${m.lastDays} 天没往来，逢年过节走动一下`
      });
    }
    if (p.birthday) {
      const d = daysUntil(p.birthday, now);
      if (d >= 0 && d <= 7) {
        out.push({
          ic: 'bday',
          cls: 'teal',
          personId: p.id,
          text: `<b>${esc(p.name)}</b>：生日${d === 0 ? '就是今天' : `还有 ${d} 天`}，记得送上祝福`
        });
      }
    }
  }
  for (const r of state.reminders) {
    if (r.status === 'pending' && (!r.date || r.date <= todayStr(now))) {
      out.push({
        ic: 'todo',
        cls: 'blue',
        personId: r.personId,
        text: `待办：${esc(r.content)}`,
        reminderId: r.id
      });
    }
  }
  const PRIO: Record<string, number> = { red: 0, amber: 1, teal: 2, blue: 3 };
  out.sort((a, b) => PRIO[a.cls] - PRIO[b.cls]);
  return out.slice(0, 8);
}

export function getSuggestion(state: AppState, p: Person, now: number = Date.now()): string {
  const m = computePerson(state, p, now);
  if (m.debt >= 20) return '人情要趁热还：找个由头约顿饭，开场提一句「上次那事多亏你」，顺手带点小特产，把债了了。';
  if (m.lastDays !== null && m.lastDays >= 60) return '别硬找话题：以问候破冰最自然——「最近忙啥呢，好久没聚了」，顺势约个饭或喝杯茶。';
  if (m.intimacy >= 70) return '关系正热，值得深化：约个球局或下午茶，聊点工作之外的事，让交情从「有事才联系」变成「没事也联系」。';
  if (m.lastDays === null) return '刚认识，别急着使劲：逢年过节一句问候、偶尔点赞互动，先自然熟络，再找机会深交。';
  return '保持节奏：隔一两周一句问候即可，不用刻意。关系是细水长流，不是突击任务。';
}

export function relationRead(state: AppState, p: Person, now: number = Date.now()): string {
  const m = computePerson(state, p, now);
  const seg: string[] = [];
  if (m.lastDays === null) seg.push('刚记进来，还没怎么走动');
  else if (m.lastDays >= 60) seg.push('有段时间没走动了');
  else seg.push('近期还在来往');
  if (m.intimacy >= 65) seg.push('关系挺亲，能交心');
  else if (m.intimacy >= 35) seg.push('关系不错，熟而不腻');
  else seg.push('还停留在客气阶段');
  if (m.debt >= 15) seg.push(`欠着人情（${Math.round(m.debt)}），记得还`);
  else if (m.debt > 0) seg.push('还略欠点人情，有空回个礼');
  else seg.push('人情账清清爽爽，互不亏欠');
  if (m.heat >= 70) seg.push('热度在线，趁热经营');
  else if (m.heat < 45) seg.push('热度偏低，多走动会回暖');
  return seg.join('，') + '。';
}
