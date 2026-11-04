import type { AppState } from './types';
import { fmtDate } from './date';
import { getWisdom, getLevel, overallMetrics, computedFor } from './engine';

/** 成就条目：cur 为当前进度，need 为达成阈值，done = cur >= need。 */
export interface Achievement {
  t: string;
  d: string;
  cur: number;
  need: number;
  done: boolean;
}

/** 月度洞察：本月往来统计。 */
export interface MonthInsights {
  ym: string;
  count: number;
  top: { id: string; name: string; count: number }[];
  newPersons: number;
  topDebts: { id: string; name: string; debt: number }[];
}

/** 年度报告：最近 12 个月滚动回顾。 */
export interface AnnualReport {
  months: { label: string; count: number }[];
  total: number;
  peak: number;
  bestMonths: string[];
  topPersons: { id: string; name: string; count: number }[];
  topDebts: { id: string; name: string; debt: number }[];
  wisdom: number;
  level: { name: string; desc: string };
  keywords: string[];
}

/**
 * 成就体系。全部由当前数据实时推导，不新增持久化字段（避免数据结构迁移风险）。
 * 定义与 legacy `_app_dev.js` 的 achievementsList 保持一致。
 */
export function achievements(state: AppState, now: number = Date.now()): Achievement[] {
  const nP = state.persons.length;
  const nE = state.events.length;
  const sk = state.streak || { n: 0, last: '' };
  const trained = Object.keys(state.progress || {}).filter((k) => state.progress[k].times > 0).length;
  const withBirthday = state.persons.filter((p) => p.birthday).length;
  const m = overallMetrics(state, now);
  const idx = m ? m.index : 0;
  let clear = nP > 0;
  for (const p of state.persons) {
    const mm = computedFor(state, p.id, now);
    if (mm && mm.debt > 0) { clear = false; break; }
  }
  const defs = [
    { t: '破冰者', d: '记下第一笔往来', cur: Math.min(nE, 1), need: 1 },
    { t: '初结人脉', d: '添加 5 位人脉', cur: Math.min(nP, 5), need: 5 },
    { t: '圈子成型', d: '添加 20 位人脉', cur: Math.min(nP, 20), need: 20 },
    { t: '百人脉络', d: '添加 100 位人脉', cur: Math.min(nP, 100), need: 100 },
    { t: '日积月累', d: '累计 50 笔往来', cur: Math.min(nE, 50), need: 50 },
    { t: '人情练达', d: '累计 200 笔往来', cur: Math.min(nE, 200), need: 200 },
    { t: '三日不辍', d: '连续记录 3 天', cur: Math.min(sk.n, 3), need: 3 },
    { t: '七日成习', d: '连续记录 7 天', cur: Math.min(sk.n, 7), need: 7 },
    { t: '初入修炼', d: '完成 5 道情景题', cur: Math.min(trained, 5), need: 5 },
    { t: '世事洞明', d: '完成 15 道情景题', cur: Math.min(trained, 15), need: 15 },
    { t: '两不相欠', d: '所有人情账都还清', cur: clear ? 1 : 0, need: 1 },
    { t: '人情大师', d: '人情指数达到 60', cur: Math.min(idx, 60), need: 60 },
    { t: '细心人', d: '为 3 位人脉记下生日', cur: Math.min(withBirthday, 3), need: 3 }
  ];
  return defs.map((x) => ({ t: x.t, d: x.d, cur: x.cur, need: x.need, done: x.cur >= x.need }));
}

/** 本月统计：往来笔数、走动最勤的人、新增人脉、人情债前三。 */
export function monthInsights(state: AppState, now: number = Date.now()): MonthInsights {
  const d = new Date(now);
  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const mev = state.events.filter((e) => fmtDate(e.time).startsWith(ym));
  const byPerson = new Map<string, number>();
  for (const e of mev) byPerson.set(e.personId, (byPerson.get(e.personId) || 0) + 1);
  const nameOf = (id: string): string => state.persons.find((p) => p.id === id)?.name || '';
  const top = [...byPerson.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, count]) => ({ id, name: nameOf(id), count }));
  const topDebts = state.persons
    .map((p) => ({ p, m: computedFor(state, p.id, now) }))
    .filter((x) => x.m !== null && x.m.debt > 0)
    .sort((a, b) => (b.m!.debt) - (a.m!.debt))
    .slice(0, 3)
    .map((x) => ({ id: x.p.id, name: x.p.name, debt: x.m!.debt }));
  const newPersons = state.persons.filter((p) => fmtDate(p.createdAt || 0).startsWith(ym)).length;
  return { ym, count: mev.length, top, newPersons, topDebts };
}

/**
 * 年度报告：最近 12 个月滚动回顾。
 * 关键词由数据推导，给用户一段可读的年度总结，而不是一堆数字。
 */
export function annualReport(state: AppState, now: number = Date.now()): AnnualReport {
  const d = new Date(now);
  const months: { label: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const md = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const ym = `${md.getFullYear()}-${String(md.getMonth() + 1).padStart(2, '0')}`;
    months.push({ label: `${md.getMonth() + 1}月`, count: state.events.filter((e) => fmtDate(e.time).startsWith(ym)).length });
  }
  const total = months.reduce((s, x) => s + x.count, 0);
  const peak = Math.max(...months.map((x) => x.count), 1);
  const bestMonths = months.filter((x) => x.count === peak).map((x) => x.label);

  // 12 个月窗口的起点必须是「11 个月前的 1 号」，而不是「去年同月的 1 号」。
  // 后者会把第 13 个月的数据也算进来，和上面 months 数组统计的区间对不上。
  const windowStart = new Date(d.getFullYear(), d.getMonth() - 11, 1).getTime();
  const byPerson = new Map<string, number>();
  for (const e of state.events) if (e.time >= windowStart) byPerson.set(e.personId, (byPerson.get(e.personId) || 0) + 1);
  const topPersons = [...byPerson.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, count]) => ({ id, name: state.persons.find((p) => p.id === id)?.name || '', count }));

  const topDebts = state.persons
    .map((p) => ({ p, m: computedFor(state, p.id, now) }))
    .filter((x) => x.m !== null && x.m.debt > 0)
    .sort((a, b) => (b.m!.debt) - (a.m!.debt))
    .slice(0, 3)
    .map((x) => ({ id: x.p.id, name: x.p.name, debt: x.m!.debt }));

  const w = getWisdom(state);
  const lv = getLevel(w);
  const keywords: string[] = [];
  if (total === 0) {
    keywords.push('这一年的往来还是一张白纸，从记录第一笔开始');
  } else {
    if (total >= 60) keywords.push('走动很勤，是圈子里的人脉活跃分子');
    else if (total >= 20) keywords.push('保持了节奏，关系细水长流');
    else keywords.push('往来偏少，明年可以多走动');
  }
  if (w >= 60) keywords.push('修炼有成，已迈入人情大师');
  else if (w >= 15) keywords.push('修炼起步，已略懂世故');
  if (topDebts.length) keywords.push(`人情债榜首是「${topDebts[0].name}」，记得还`);

  return {
    months,
    total,
    peak,
    bestMonths,
    topPersons,
    topDebts,
    wisdom: w,
    level: { name: lv.cur.name, desc: lv.cur.desc },
    keywords
  };
}
