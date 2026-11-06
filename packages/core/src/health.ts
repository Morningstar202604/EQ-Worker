import { DAY } from './date';
import { computePerson } from './engine';
import { fmtMoney, personLedger } from './ledger';
import { clamp } from './sanitize';
import type { AppState, HealthRankingItem, HealthResult, Person } from './types';

export function personHealth(state: AppState, p: Person, now: number = Date.now()): HealthResult {
  const m = computePerson(state, p, now);
  const l = personLedger(state, p.id);
  const evs = state.events.filter((e) => e.personId === p.id);
  /* 未来冲突尚未发生，不参与「近一年摩擦」统计。 */
  const conflicts = evs.filter((e) => e.type === 'conflict' && e.time <= now && now - e.time < 365 * DAY).length;
  const reciprocity = l.net === 0 ? 100 : clamp(100 - Math.abs(l.net) / 30, 20, 95);
  /* 人情债必须进入评分。之前只算 heat/trust/intimacy/activity/reciprocity，
     而收礼、受助会同时抬高前三项，结果「欠得越多分越高」：
     实测一个人累计欠 62 点人情债，健康分 89「关系稳固」，
     同一条 tips 却写着「人情债偏高，近期安排一次回礼」——分数与建议自相矛盾。 */
  const debtPenalty = clamp(m.debt, 0, 100) * 0.18;
  const score = clamp(
    Math.round(
      0.28 * m.heat + 0.22 * m.trust + 0.2 * m.intimacy + 0.15 * m.activity + 0.15 * reciprocity - conflicts * 6 - debtPenalty
    ),
    0,
    100
  );
  let level = '需要经营';
  let cls = 'red';
  if (score >= 80) {
    level = '关系稳固';
    cls = 'teal';
  } else if (score >= 60) {
    level = '状态不错';
    cls = 'green';
  } else if (score >= 40) {
    level = '可以更好';
    cls = 'amber';
  }
  const tips: string[] = [];
  if (m.debt >= 20) tips.push('人情债偏高，近期安排一次回礼或请饭');
  if (l.net > 0) tips.push(`账本净欠 ${fmtMoney(l.net)}，找机会还上或回个等值礼`);
  else if (l.net < 0) tips.push(`对方净欠 ${fmtMoney(-l.net)}，可温和提醒，也可等对方主动`);
  if (m.lastDays === null) tips.push('还没有往来记录，先从一次轻量问候开始');
  else if (m.lastDays >= 60) tips.push(`${m.lastDays} 天没联系，发句近况问候破冰`);
  if (conflicts) tips.push(`近一年有 ${conflicts} 次摩擦，适当降温、就事论事`);
  if (!tips.length) tips.push('保持当前节奏，偶尔分享近况就能维系');
  return { score, level, cls, tips, reciprocity: Math.round(reciprocity), conflicts };
}

export function healthRanking(state: AppState, now: number = Date.now()): HealthRankingItem[] {
  return state.persons
    .map((p) => ({ p, h: personHealth(state, p, now), l: personLedger(state, p.id) }))
    .sort((a, b) => a.h.score - b.h.score || a.p.name.localeCompare(b.p.name, 'zh'));
}
