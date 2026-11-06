import { CITY_TIERS, CONDOLENCE_AMOUNTS, GIFT_BASE, GIFT_TIERS, NICE_AMOUNTS, OCCASIONS } from './constants';
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

/* 账本默认只看已发生的往来。未来事件既没有真实发生，也不该影响净额与提醒；
   调用方确实需要全量时可以传 now=Infinity。 */
export function personLedger(state: AppState, personId: string, now: number = Date.now()): Ledger {
  let given = 0;
  let received = 0;
  let givenCount = 0;
  let receivedCount = 0;
  let lastAmount = 0;
  let lastDir: Dir = 'none';
  let lastTime = 0;
  for (const e of state.events) {
    if (e.personId !== personId) continue;
    if (e.time > now) continue;
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

/**
 * 按「钱的性质」拆账：借款本金 vs 礼金。
 *
 * 为什么必须拆：借款要还本金，礼金要在对方办事时还，两者不能互相折算。
 * 以前用总净额结清，会把「收礼 1000 + 借款 5000」算成 6000；
 * 也会把一顿饭的支出算进礼金余额。这里统一成唯一口径，供
 * settlePrefill / buildActions / giftAdvice 共用，避免三处各写一套。
 *
 * 返回值为「我欠对方的金额」：正数表示我欠，负数表示对方欠我。
 */
export function balanceByKind(state: AppState, personId: string, now: number = Date.now()): { loan: number; gift: number } {
  let loan = 0;
  let gift = 0;
  for (const e of state.events) {
    if (e.personId !== personId) continue;
    if (e.time > now) continue;
    const amt = Number(e.amount) || 0;
    if (amt <= 0) continue;
    const dir = eventDir(e);
    if (dir === 'none') continue;
    const sign = dir === 'in' ? amt : -amt;
    if (e.type === 'money') loan += sign;
    else if (e.type === 'gift_get' || e.type === 'gift_give') gift += sign;
    // 餐饮、其他、帮忙等带金额事件不计入这两本账：它们是人情，不是钱债。
  }
  return { loan, gift };
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
  const byOcc: Record<string, number> = Object.create(null);
  for (const e of state.events) {
    /* 未来事件还没发生，不计入「本月/累计」统计——
       否则会出现「累计送出 0，本月送出 2000」这种同屏矛盾。 */
    if (e.time > now) continue;
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
  /* 借款与礼金必须分开结，且只统计对应类型的事件。
     以前用总净额，会把餐饮/帮忙等流水也算进礼金余额。 */
  const bal = balanceByKind(state, personId);
  const target = kind === 'loan' ? bal.loan : bal.gift;
  if (!target) return null;
  const owe = target > 0;
  const amount = Math.abs(target);
  const isLoan = kind === 'loan';
  return {
    personId,
    type: isLoan ? 'money' : owe ? 'gift_give' : 'gift_get',
    dir: owe ? 'out' : 'in',
    amount,
    occasion: isLoan ? '其他' : '还礼',
    title: isLoan ? (owe ? '还款' : '收回借款') : owe ? '回礼' : '收到回礼',
    net: target,
    owe
  };
}

export function niceAmount(n: unknown): number {
  const raw = Number(n);
  // Infinity 会一路传进金额字段，写入 JSON 时变成 null，读回来又当 0 —— 静默丢数。
  // 非有限数直接归零，让问题在写入前就消失。
  const v = Number.isFinite(raw) ? Math.max(0, raw) : 0;
  if (v > 10000) return Math.round(v / 1000) * 1000;
  return NICE_AMOUNTS.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a), 0);
}

/** 喜事场合：用于「红白事不可对冲」这类只对喜事成立的提示。 */
function isJoyOccasion(occ: string): boolean {
  return occ === '婚礼' || occ === '满月' || occ === '乔迁' || occ === '寿宴' ||
    occ === '升学' || occ === '开业' || occ === '生日' || occ === '节日';
}

/** 白事取整：只向上取到单数档，绝不把帛金凑成 800 这类喜宴数字。 */
function condolenceAmount(n: number): number {
  const v = Number.isFinite(n) ? Math.max(0, n) : 0;
  const up = CONDOLENCE_AMOUNTS.find((a) => a >= v);
  if (up !== undefined) return up;
  return Math.ceil(v / 100) * 100 + 1;
}

export function giftAdvice(
  state: AppState,
  personId: string,
  occasion: string,
  opts: { tier?: GiftTier; city?: CityTier; now?: number } = {}
): GiftAdvice {
  const now = typeof opts.now === 'number' ? opts.now : Date.now();
  const p = state.persons.find((x) => x.id === personId) || null;
  const identity = (p && p.identity) || '其他';
  // 不再把未知场合静默折叠成「其他」：那样历史锚点会对不上，
  // 用户也看不出参谋其实没听懂他问的是什么。
  const recognized = (OCCASIONS as readonly string[]).includes(occasion);
  const occ: Occasion = recognized ? (occasion as Occasion) : '其他';
  const isFuneral = occ === '白事';
  const table = GIFT_BASE[identity] || GIFT_BASE['其他'];
  const base = table[occ] || table['其他'];
  const st = state.settings || ({} as AppState['settings']);
  const tier = (opts.tier && GIFT_TIERS[opts.tier]) || (st.giftTier && GIFT_TIERS[st.giftTier]) || GIFT_TIERS.standard;
  const cityName: CityTier = opts.city && CITY_TIERS[opts.city] ? opts.city : CITY_TIERS[st.cityTier] ? st.cityTier : '二线';
  const city = CITY_TIERS[cityName];
  /* 本档行情值。uplift 单独记录「因净欠而上浮」的系数，
     最后统一参与三档计算——之前直接改 mid 变量，会在后面重算时被覆盖，
     导致文案写「上浮 10%」而金额没变。 */
  let uplift = 1;
  const mid = base * tier.mult * city;
  const reasons = [
    `关系「${identity}」× 场合「${occ}」的基准参考约 ${fmtMoney(base)}（未乘档位/城市系数）`,
    `档位「${tier.label}」× 城市「${cityName}」系数 ${city}`
  ];
  const l = personLedger(state, personId, now);
  const bal = balanceByKind(state, personId, now);
  /* 锚点只看礼金类事件。以前把 money 也算进来，
     一笔 5000 借款会把「还礼」的中位直接推到 5000。 */
  const giftInEvents = state.events
    .filter((e) => e.personId === personId && (e.type === 'gift_get' || e.type === 'gift_give')
      && eventDir(e) === 'in' && e.time <= now);
  const sameOcc = giftInEvents
    .filter((e) => e.occasion === occ)
    .reduce((mx, e) => Math.max(mx, Number(e.amount)), 0);
  const maxReceived = giftInEvents.reduce((mx, e) => Math.max(mx, Number(e.amount)), 0);
  /* 历史锚点只允许向上锚定。「对方给过 1050，还礼不低于此数」之后再用
     niceAmount 取最近值，会得到 1000——文案说「不低于」，数字却更低，
     等于直接违反自己给出的规则。所以锚点单独记为 floor，取整后再抬回来。 */
  let floor = 0;
  if (sameOcc > 0) {
    floor = sameOcc;
    reasons.push(`对方在「${occ}」给过你 ${fmtMoney(sameOcc)}，还礼不低于此数才不失礼`);
  } else if (occ === '还礼' && maxReceived > 0) {
    floor = maxReceived;
    reasons.push(`对方给过你的最大单笔是 ${fmtMoney(maxReceived)}，还礼建议不低于此数`);
  } else if (bal.gift >= 300) {
    uplift = 1.1;
    reasons.push(`人情账上你净欠对方 ${fmtMoney(bal.gift)}，建议适度上浮 10%`);
  }
  if (p && p.likes) reasons.push(`对方喜欢：${p.likes}，可优先按喜好挑礼物`);
  if (p && p.taboos) reasons.push(`需要避开：${p.taboos}`);
  /* 红白事不可对冲：收过对方帛金的人，在对方喜事上要按喜事行情单独随，
     不能拿当年帛金数额去抵——这是最常见的「算错人情」之一。 */
  const funeralIn = state.events
    .filter((e) => e.personId === personId && eventDir(e) === 'in' && e.occasion === '白事' && e.time <= now)
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  /* 只对喜事提示。以前只判断「不是白事」，导致探病也会出现
     「本场请按喜事行情单独随礼」这种语病。 */
  if (funeralIn > 0 && isJoyOccasion(occ)) {
    reasons.push(`你收过对方的白事帛金 ${fmtMoney(funeralIn)}；白事与喜事不能等额对冲，本场请按喜事行情单独随礼`);
  }

  /* 三档金额构造。四条约束全部由构造保证：
     ① low < mid < high（否则「重视」等于「建议」，档位切换失效）
     ② mid 与 high 不低于锚点 floor（还礼不低于对方给过的数）
     ③ low 允许低于锚点——「从简」的语义本就是量力而行、以到场补上
     ④ 白事三档全是单数
     做法：先定 mid，再向两侧各取一个合法档位，最后做一次单调修正。
     不再依赖「事后把某档抬到 floor」这类补丁——那样会让三档挤成同一个数
     （实测：客户婚礼来礼 800 时，三档会全变成 800）。 */
  const toLegal = (v: number): number => (isFuneral ? condolenceAmount(v) : niceAmount(v));
  const stepOf = (v: number): number => (isFuneral ? 100 : Math.max(100, Math.round((v * 0.2) / 100) * 100));

  /* 锚点必须「向上取整」到不低于原值：niceAmount(501) 会就近取到 500，
     直接把还礼压到对方给过的数以下，违反「不低于」的承诺。 */
  const ceilLegal = (v: number): number => {
    if (isFuneral) return condolenceAmount(v);
    if (v <= 0) return 0;
    const hit = NICE_AMOUNTS.find((a) => a >= v);
    return hit !== undefined ? hit : Math.ceil(v / 1000) * 1000;
  };
  const floorLegal = floor > 0 ? ceilLegal(floor) : 0;
  // 建议档：不低于行情，也不低于锚点（锚点向上取整，避免被就近取整压低）
  const midA = ceilLegal(Math.max(base * tier.mult * city * uplift, floorLegal));
  // 从简档：按从简行情算；若与 mid 并列则向下让一档
  let low = toLegal(base * GIFT_TIERS.simple.mult * city * uplift);
  // 重视档：按重视行情算；若与 mid 并列则向上让一档
  let high = toLegal(base * GIFT_TIERS.generous.mult * city * uplift);

  /* 修正并列时必须仍然走取整表：
     之前用 `midA + 100` 兜底，会产出 400/700/2100/3100 这类非标准金额，
     其中 400 还和自家礼俗提示「喜事忌 4」直接冲突。现在一律 toLegal/ceilLegal。 */
  if (low >= midA) low = toLegal(Math.max(isFuneral ? 101 : 0, midA - stepOf(midA)));
  if (high <= midA) high = ceilLegal(midA + stepOf(midA));
  if (low >= midA) low = isFuneral ? 101 : 0;
  if (high <= midA) high = ceilLegal(midA + 1000);

  reasons.push(`综合后中位约 ${fmtMoney(mid)}，按${isFuneral ? '白事单数' : '常见礼金'}规则取整为 ${fmtMoney(midA)}`);
  if (isFuneral) {
    reasons.push('白事礼金按当地习惯多为单数，且忌用喜事吉数；具体数额请以本地风俗为准');
  }
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

/* 送礼忌讳：中国送礼的第一道门槛不是「送多贵」，而是「别送错」。
   这里只收全国通行、争议最小的几条；地域性讲究差异太大，交给用户自己在备注里补。 */
export interface GiftTabooHit {
  keyword: string;
  reason: string;
}

/* 每条规则给出「触发词」与「豁免词」：
   纯子串匹配会把「凤梨酥」判成梨、「菊花茶」判成白菊、「钟爱一生巧克力」判成钟，
   误报比漏报更烦人——用户会直接不信这套提示。豁免词优先判定。 */
const GIFT_TABOO_RULES: Array<{ words: string[]; exempt?: string[]; reason: string }> = [
  { words: ['座钟', '挂钟', '台钟', '闹钟', '送钟'], exempt: ['钟爱'], reason: '「送钟」谐音「送终」，是最广为人知的忌讳，尤其不能送长辈' },
  { words: ['雨伞', '阳伞', '折叠伞', '一把伞'], exempt: ['伞架', '伞柄'], reason: '「伞」谐音「散」，寓意分散，不适合作为礼物' },
  { words: ['雪梨', '鸭梨', '香梨', '梨子', '一箱梨', '果篮含梨'], exempt: ['凤梨', '梨膏', '梨糖'], reason: '「梨」谐音「离」，探病与团圆场合都尽量避开' },
  { words: ['运动鞋', '皮鞋', '球鞋', '一双鞋'], exempt: ['鞋拔', '鞋架', '鞋柜'], reason: '「鞋」谐音「邪」，也有「走掉」之意，送伴侣或长辈要谨慎' },
  { words: ['白菊', '菊花束', '菊花篮'], exempt: ['菊花茶', '菊普'], reason: '白菊多用于祭奠，喜庆与探病场合不宜' },
  { words: ['白蜡烛', '蜡烛台'], reason: '白蜡烛属祭奠用品，不可作日常礼物' },
  { words: ['菜刀', '剪刀', '刀具', '一把刀'], reason: '刀剪有「一刀两断」之意，容易让人多想' }
];

/**
 * 检查礼物名称是否踩到通行忌讳。
 * 只匹配明确指向该类物品的词，并先排除豁免词，避免「凤梨酥」被判成梨。
 */
export function checkGiftTaboo(giftName: string, occasion: string): GiftTabooHit[] {
  if (occasion === '白事') return [];
  const name = String(giftName || '');
  if (!name) return [];
  const hits: GiftTabooHit[] = [];
  for (const rule of GIFT_TABOO_RULES) {
    if (rule.exempt && rule.exempt.some((w) => name.includes(w))) continue;
    const hit = rule.words.find((w) => name.includes(w));
    if (hit) hits.push({ keyword: hit, reason: rule.reason });
  }
  return hits;
}

/**
 * 按场合给出「不该送什么」的通用提示。
 * 这里只讲「送什么东西」；穿着、言辞、时机属于 etiquette.ts 的范畴，
 * 两处不重叠，避免 UI 里出现两条几乎一样的话。
 */
export function giftAvoidTips(occasion: string): string[] {
  if (occasion === '白事') {
    return ['帛金用素色信封、不包红封；不送双数', '不送喜庆花篮与彩头礼品'];
  }
  if (occasion === '探病') {
    return ['忌送梨（离）、白菊、钟表；避免送需要病人忌口的东西'];
  }
  if (occasion === '寿宴' || occasion === '生日') {
    return ['忌送钟表、鞋、伞；可选寿桃、寿面、茶叶或实用保健品'];
  }
  return ['通用忌讳：不送钟、伞、梨、鞋、白菊、刀具；喜事不送单数（白事除外）'];
}
