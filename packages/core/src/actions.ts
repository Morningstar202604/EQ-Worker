import { DAY, daysUntil, todayStr, upcomingFestival } from './date';
import { computePerson } from './engine';
import { fmtMoney, personLedger } from './ledger';
import type { ActionItem, AppState } from './types';

export function buildActions(state: AppState, limit: number = 6, now: number = Date.now()): ActionItem[] {
  const out: ActionItem[] = [];
  const push = (a: ActionItem) => out.push(a);

  for (const p of state.persons) {
    const m = computePerson(state, p, now);
    const l = personLedger(state, p.id);

    if (p.birthday) {
      const d = daysUntil(p.birthday, now);
      if (d >= 0 && d <= 7) {
        push({
          key: 'bday:' + p.id, personId: p.id, tone: 'teal', icon: 'bday', prio: d <= 1 ? 92 : 84,
          title: `${p.name} 的生日${d === 0 ? '就是今天' : `还有 ${d} 天`}`,
          reason: '生日是低成本、高回报的走动时机，一句祝福比临时送礼更自然。',
          primary: { label: '写句祝福', act: 'scriptModal', arg: 'birthday|' + p.id },
          secondary: { label: '记一笔', act: 'eventQuick', arg: p.id }
        });
      }
    }

    if (p.anniversary) {
      const d = daysUntil(p.anniversary, now);
      if (d >= 0 && d <= 7) {
        push({
          key: 'ann:' + p.id, personId: p.id, tone: 'teal', icon: 'bday', prio: d <= 1 ? 90 : 80,
          title: `${p.name} 的重要纪念日${d === 0 ? '就是今天' : `还有 ${d} 天`}`,
          reason: '纪念日比生日更私密，提一句会让对方觉得你真的记得。',
          primary: { label: '写句话', act: 'scriptModal', arg: 'anniversary|' + p.id },
          secondary: { label: '记一笔', act: 'eventQuick', arg: p.id }
        });
      }
    }

    if (m.debt >= 20) {
      push({
        key: 'debt:' + p.id, personId: p.id, tone: 'amber', icon: 'debt', prio: 82,
        title: `还 ${p.name} 的人情`,
        reason: `你欠着 ${Math.round(m.debt)} 点人情，拖久了会变成心理负担。约顿饭或回个礼，把话说开。`,
        primary: { label: '怎么回礼', act: 'giftModal', arg: p.id },
        secondary: { label: '记一笔', act: 'eventQuick', arg: p.id }
      });
    }

    if (l.net >= 300) {
      push({
        key: 'money-owe:' + p.id, personId: p.id, tone: 'amber', icon: 'money', prio: 78,
        title: `你在账本上净欠 ${p.name} ${fmtMoney(l.net)}`,
        reason: '钱和礼都要有来有往。先确认是礼金还是借款，再决定回礼还是还款。',
        primary: { label: '还礼参谋', act: 'giftModal', arg: p.id },
        secondary: { label: '去记录', act: 'eventQuick', arg: p.id }
      });
    } else if (l.net <= -300) {
      push({
        key: 'money-due:' + p.id, personId: p.id, tone: 'blue', icon: 'money', prio: 46,
        title: `${p.name} 还欠你 ${fmtMoney(-l.net)}`,
        reason: '如果是借款，找个轻松的由头提一句；如果是礼金，等合适场合自然回礼即可。',
        primary: { label: '催还话术', act: 'scriptModal', arg: 'collect_debt|' + p.id },
        secondary: { label: '去记录', act: 'eventQuick', arg: p.id }
      });
    }

    if (m.lastDays !== null && m.lastDays >= 60) {
      push({
        key: 'stale:' + p.id, personId: p.id, tone: 'red', icon: 'stale', prio: 72,
        title: `和 ${p.name} 已 ${m.lastDays} 天没往来`,
        reason: '关系不是靠大事维系的。发一句近况、约一次饭，比逢年过节群发更有用。',
        primary: { label: '破冰话术', act: 'scriptModal', arg: 'reconnect|' + p.id },
        secondary: { label: '记一笔', act: 'eventQuick', arg: p.id }
      });
    }

    const helps = state.events
      .filter((e) => e.personId === p.id && e.type === 'help_them')
      .sort((a, b) => b.time - a.time);
    if (helps.length) {
      const age = (now - helps[0].time) / DAY;
      if (age >= 1 && age <= 10) {
        push({
          key: 'thanks:' + p.id, personId: p.id, tone: 'teal', icon: 'thanks', prio: 68,
          title: `向 ${p.name} 道个谢`,
          reason: `「${helps[0].title || '对方帮了你'}」已经过去 ${Math.floor(age)} 天，及时反馈比事后补礼更让人舒服。`,
          primary: { label: '道谢话术', act: 'scriptModal', arg: 'thanks|' + p.id },
          secondary: { label: '记一笔', act: 'eventQuick', arg: p.id }
        });
      }
    }

    if (['领导', '客户', '长辈'].includes(p.identity) && m.lastDays !== null && m.lastDays >= 45 && m.lastDays < 60) {
      push({
        key: 'key:' + p.id, personId: p.id, tone: 'blue', icon: 'key', prio: 52,
        title: `维护 ${p.name} 这条关键关系`,
        reason: `「${p.identity}」关系不宜长期断联，45 天是个自然的问候节点。`,
        primary: { label: '约一下', act: 'scriptModal', arg: 'invite|' + p.id },
        secondary: { label: '记一笔', act: 'eventQuick', arg: p.id }
      });
    }
  }

  for (const r of state.reminders) {
    if (r.status === 'pending' && (!r.date || r.date <= todayStr(now))) {
      const p = state.persons.find((x) => x.id === r.personId);
      push({
        key: 'todo:' + r.id, personId: r.personId || '', tone: 'blue', icon: 'todo', prio: 95,
        title: `待办：${r.content}`,
        reason: (p ? p.name + ' · ' : '') + (r.date ? `约定日期 ${r.date}` : '没有设定日期，今天处理掉'),
        primary: { label: '完成', act: 'quickDone', arg: r.id },
        secondary: p ? { label: '记一笔', act: 'eventQuick', arg: p.id } : null
      });
    }
  }

  const fst = upcomingFestival(now);
  if (fst) {
    push({
      key: 'festival', personId: '', tone: 'blue', icon: 'fest', prio: fst.days <= 1 ? 86 : 40,
      title: `${fst.days === 0 ? '今天是' : fst.days + ' 天后是'}${fst.n}`,
      reason: '节日祝福适合群发，但对重要的人要单独改一句，才有温度。',
      primary: { label: '写祝福', act: 'scriptModal', arg: 'festival|' },
      secondary: { label: '看人脉', act: 'go', arg: 'persons' }
    });
  }

  out.sort((a, b) => b.prio - a.prio);
  const seen = new Set<string>();
  const picked: ActionItem[] = [];
  for (const a of out) {
    if (a.personId) {
      if (seen.has(a.personId)) continue;
      seen.add(a.personId);
    }
    picked.push(a);
    if (picked.length >= (limit || 6)) break;
  }
  return picked;
}
