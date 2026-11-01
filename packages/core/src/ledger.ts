import { CITY_TIERS, GIFT_BASE, GIFT_TIERS, NICE_AMOUNTS, OCCASIONS } from './constants';
import { fmtDate } from './date';
import type {
  AppState,
  CityTier,
  Dir,
  GiftAdvice,
  GiftTier,
  Ledger,
  LedgerInsights,
  LedgerTotals,
  Occasion,
  PersonalEvent,
  SettlePrefill
} from './types';

export function fmtMoney(n: unknown): string {
  return '¥' + Math.round(Number(n) || 0).toLocaleString('zh-CN');
}

export function ledgerNetShort(net: unknown): string {
  const n = Number(net) || 0;
  return n === 0 ? '两清' : (n > 0 ? '欠 ' : '应收 ') + fmtMoney(Math.abs(n));
}

export function ledgerNetLabel(net: unknown): string {
  const n = Number(net) || 0;
  return n === 0 ? '两清' : (n > 0 ? '我欠 ' : '对方欠 ') + fmtMoney(Math.abs(n));
}

export function eventDir(e: Pick<PersonalEvent, 'amount' | 'dir' | 'type'>): Dir {
  if (!(Number(e.amount) > 0)) return 'none';
  if (e.dir === 'in' || e.dir === 'out') return e.dir;
  if (e.type === 'gift_get') return 'in';
  if (e.type === 'gift_give') return 'out';
  return 'none';
}

export function personLedger(state: AppState, personId: string): Ledger {
  let given = 0;
  let received = 0;
  let givenCount = 0;
  let receivedCount = 0;
  let lastAmount = 0;
  let lastDir: Dir = 'none';
  let lastTime = 0;
  for (const e of state.events) {
    if (e.personId !== personId) continue;
    const amt = Number(e.amount) || 0;
    if (amt <= 0) continue;
    const dir = eventDir(e);
    if (dir === 'out') {
      given += amt;
      givenCount++;
    } else if (dir === 'in') {
      received += amt;
      receivedCount++;
    } else continue;
    if (e.time >= lastTime) {
      lastTime = e.time;
      lastAmount = amt;
      lastDir = dir;
    }
  }
  const net = received - given;
  return {
    given,
    received,
    net,
    givenCount,
    receivedCount,
    lastAmount,
    lastDir,
    status: net > 0 ? 'owe' : net < 0 ? 'due' : 'clear'
  };
}

export function ledgerTotals(state: AppState): LedgerTotals {
  let given = 0;
  let received = 0;
  let owe = 0;
  let due = 0;
  let oweCount = 0;
  let dueCount = 0;
  for (const p of state.persons) {
    const l = personLedger(state, p.id);
    given += l.given;
    received += l.received;
    if (l.net > 0) {
      owe += l.net;
      oweCount++;
    } else if (l.net < 0) {
      due += -l.net;
      dueCount++;
    }
  }
  return { given, received, net: received - given, owe, due, oweCount, dueCount };
}

export function ledgerInsights(state: AppState, now: number = Date.now()): LedgerInsights {
  const d = new Date(now);
  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  let monthGiven = 0;
  let monthReceived = 0;
  let monthCount = 0;
  let totalGiven = 0;
  let givenCount = 0;
  let maxGift = 0;
  const byOcc: Record<string, number> = {};
  for (const e of state.events) {
    const amt = Number(e.amount) || 0;
    if (amt <= 0) continue;
    const dir = eventDir(e);
    if (dir === 'none') continue;
    if (fmtDate(e.time).startsWith(ym)) {
      monthCount++;
      if (dir === 'out') monthGiven += amt;
      else monthReceived += amt;
    }
    if (dir === 'out') {
      totalGiven += amt;
      givenCount++;
      maxGift = Math.max(maxGift, amt);
      const occ = e.occasion || '其他';
      byOcc[occ] = (byOcc[occ] || 0) + amt;
    }
  }
  const top = Object.entries(byOcc).sort((a, b) => b[1] - a[1])[0] || null;
  return {
    ym,
    monthGiven,
    monthReceived,
    monthCount,
    avgGiven: givenCount ? Math.round(totalGiven / givenCount) : 0,
    givenCount,
    maxGift,
    topOccasion: top ? top[0] : '',
    topOccasionAmount: top ? top[1] : 0
  };
}

export function settlePrefill(state: AppState, personId: string, kind: 'loan' | 'gift'): SettlePrefill | null {
  const p = state.persons.find((x) => x.id === personId);
  if (!p) return null;
  const l = personLedger(state, personId);
  if (!l.net) return null;
  const owe = l.net > 0;
  const amount = Math.abs(l.net);
  const isLoan = kind === 'loan';
  return {
    personId,
    type: isLoan ? 'money' : owe ? 'gift_give' : 'gift_get',
    dir: owe ? 'out' : 'in',
    amount,
    occasion: isLoan ? '其他' : '还礼',
    title: isLoan ? (owe ? '还款' : '收回借款') : owe ? '回礼' : '收到回礼',
    net: l.net,
    owe
  };
}

export function niceAmount(n: unknown): number {
  const v = Math.max(0, Number(n) || 0);
  if (v > 10000) return Math.round(v / 1000) * 1000;
  return NICE_AMOUNTS.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a), 0);
}

export function giftAdvice(
  state: AppState,
  personId: string,
  occasion: string,
  opts: { tier?: GiftTier; city?: CityTier } = {}
): GiftAdvice {
  const p = state.persons.find((x) => x.id === personId) || null;
  const identity = (p && p.identity) || '其他';
  const occ: Occasion = (OCCASIONS as readonly string[]).includes(occasion) ? (occasion as Occasion) : '其他';
  const table = GIFT_BASE[identity] || GIFT_BASE['其他'];
  const base = table[occ] || table['其他'];
  const st = state.settings || ({} as AppState['settings']);
  const tier = (opts.tier && GIFT_TIERS[opts.tier]) || (st.giftTier && GIFT_TIERS[st.giftTier]) || GIFT_TIERS.standard;
  const cityName: CityTier = opts.city && CITY_TIERS[opts.city] ? opts.city : CITY_TIERS[st.cityTier] ? st.cityTier : '二线';
  const city = CITY_TIERS[cityName];
  let mid = base * tier.mult * city;
  const reasons = [
    `关系「${identity}」× 场合「${occ}」的基准参考约 ${fmtMoney(base)}（未乘档位/城市系数）`,
    `档位「${tier.label}」× 城市「${cityName}」系数 ${city}`
  ];
  const l = personLedger(state, personId);
  const sameOcc = state.events
    .filter((e) => e.personId === personId && Number(e.amount) > 0 && eventDir(e) === 'in' && e.occasion === occ)
    .reduce((mx, e) => Math.max(mx, Number(e.amount)), 0);
  const maxReceived = state.events
    .filter((e) => e.personId === personId && Number(e.amount) > 0 && eventDir(e) === 'in')
    .reduce((mx, e) => Math.max(mx, Number(e.amount)), 0);
  if (sameOcc > 0) {
    mid = Math.max(mid, sameOcc);
    reasons.push(`对方在「${occ}」给过你 ${fmtMoney(sameOcc)}，还礼不低于此数才不失礼`);
  } else if (occ === '还礼' && maxReceived > 0) {
    mid = Math.max(mid, maxReceived);
    reasons.push(`对方累计给过你 ${fmtMoney(maxReceived)}，还礼建议不低于此数`);
  } else if (l.net >= 300) {
    mid *= 1.1;
    reasons.push(`账本上你净欠对方 ${fmtMoney(l.net)}，建议适度上浮 10%`);
  }
  if (p && p.likes) reasons.push(`对方喜欢：${p.likes}，可优先按喜好挑礼物`);
  if (p && p.taboos) reasons.push(`需要避开：${p.taboos}`);
  const midA = niceAmount(mid);
  const low = niceAmount(midA * 0.7);
  const high = niceAmount(midA * 1.3);
  reasons.push(`综合后中位约 ${fmtMoney(mid)}，按常见礼金数字取整为 ${fmtMoney(midA)}`);
  return {
    low,
    mid: midA,
    high,
    identity,
    occasion: occ,
    tier: tier.label,
    city: cityName,
    ledger: l,
    reasons,
    note: '礼金受地区、亲疏、当地风俗影响很大，本建议只是参谋，最终以你的实际关系和当地习惯为准。'
  };
}
