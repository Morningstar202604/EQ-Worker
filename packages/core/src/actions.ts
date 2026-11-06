import { DAY, daysUntil, todayStr, upcomingFestival } from './date';
import { computePerson } from './engine';
import { balanceByKind, eventDir, fmtMoney } from './ledger';
import type { ActionItem, AppState } from './types';

export function buildActions(state: AppState, limit: number = 6, now: number = Date.now()): ActionItem[] {
  const out: ActionItem[] = [];
  const push = (a: ActionItem) => out.push(a);

  for (const p of state.persons) {
    const m = computePerson(state, p, now);

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

    /* 礼金账与借款账必须分开判断，且都走 balanceByKind 这一个口径。
       以前只看净额正负：送礼 500 被写成「对方还欠你 500」并推送「催还话术」；
       而 giftBal 又忽略 dir，一笔 gift_get/dir:out 会被算成「对方给了你」。
       两件事的还法完全不同，口径必须唯一。 */
    const bal = balanceByKind(state, p.id);
    if (bal.loan >= 300) {
      push({
        key: 'loan-owe:' + p.id, personId: p.id, tone: 'amber', icon: 'money', prio: 88,
        title: `你向 ${p.name} 借了 ${fmtMoney(bal.loan)}`,
        reason: '借款要还本金，和随礼不是一回事。约个明确时间还上，比拖着更体面。',
        primary: { label: '还款话术', act: 'scriptModal', arg: 'repay_loan|' + p.id },
        secondary: { label: '记一笔还款', act: 'eventQuick', arg: p.id }
      });
    } else if (bal.loan <= -300) {
      push({
        key: 'loan-due:' + p.id, personId: p.id, tone: 'blue', icon: 'money', prio: 84,
        title: `${p.name} 还欠你 ${fmtMoney(-bal.loan)} 借款`,
        reason: '借款按约定时间收回；没有约定就说清自己的用钱安排，别用催礼的语气。',
        primary: { label: '催还话术', act: 'scriptModal', arg: 'collect_debt|' + p.id },
        secondary: { label: '去记录', act: 'eventQuick', arg: p.id }
      });
    }

    if (bal.gift >= 300) {
      push({
        key: 'gift-owe:' + p.id, personId: p.id, tone: 'amber', icon: 'gift', prio: 78,
        title: `人情账上你还欠 ${p.name} ${fmtMoney(bal.gift)}`,
        reason: '礼金讲究有来有往。等对方下次办事时还上，或以实物、请饭的方式答谢。',
        primary: { label: '还礼参谋', act: 'giftModal', arg: p.id },
        secondary: { label: '记一笔', act: 'eventQuick', arg: p.id }
      });
    }

    /* 刚收到的礼要有时间窗提醒。之前只在累计净额 ≥300 时提示，
       今天收到 200 元礼完全没有任何动作，而那正是最该道谢/记着回礼的时候。
       优先级低于借款（88/84）：借款有明确到期语义，不该被寒暄类动作压掉。 */
    const recentGift = state.events
      .filter((e) => e.personId === p.id && e.type === 'gift_get' && eventDir(e) === 'in'
        && Number(e.amount) > 0 && e.time <= now && now - e.time <= 7 * DAY)
      .sort((a, b) => b.time - a.time)[0];
    if (recentGift) {
      const age = Math.floor((now - recentGift.time) / DAY);
      push({
        key: 'gift-thanks:' + p.id, personId: p.id, tone: 'teal', icon: 'gift', prio: 82,
        title: `为 ${p.name} 的礼回个话`,
        reason: `「${recentGift.title || '对方的心意'}」${age === 0 ? '是今天' : age + ' 天前'}收到的。先说声谢谢，再把这份人情记下来，日后好还。`,
        primary: { label: '道谢话术', act: 'scriptModal', arg: 'thanks|' + p.id },
        secondary: { label: '记一笔', act: 'eventQuick', arg: p.id }
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
