// EQ-Worker · 小程序轻量版 v3.1.0 纯逻辑引擎（数据与 Web 端 v4 结构兼容）
let S = { persons: [], events: [], reminders: [], progress: {}, streak: { n: 0, last: '' }, lastEventId: null, settings: { giftTier: 'standard', cityTier: '二线' } };
const DAY = 86400000;
const SCHEMA_VERSION = 4;
const state = S; // 网页版计算函数引用全局 state，这里恒等指向 S
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function timeAgo(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return '刚刚';
  if (s < 3600) return Math.floor(s / 60) + ' 分钟前';
  if (s < 86400) return Math.floor(s / 3600) + ' 小时前';
  const d = Math.floor(s / 86400);
  if (d < 30) return d + ' 天前';
  if (d < 365) return Math.floor(d / 30) + ' 个月前';
  return Math.floor(d / 365) + ' 年前';
}
function fmtDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayStr() { return fmtDate(Date.now()); }
function toMMDD(v) { // 'YYYY-MM-DD' → 'MM-DD'（date 控件格式 → 存储格式）
  if (!v) return '';
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? m[2] + '-' + m[3] : String(v);
}
function toDateInput(v) { // 'MM-DD' → 'YYYY-MM-DD'（存储格式 → date 控件回显）
  if (!v) return '';
  const m = String(v).match(/^(\d{2})-(\d{2})$/);
  if (!m) return String(v);
  const y = new Date().getFullYear();
  const d = new Date(y, +m[1] - 1, +m[2]);
  if (d.getMonth() !== +m[1] - 1) return y + '-02-28'; // 2/29 非闰年 → 2/28，避免 date 控件吞掉生日
  return y + '-' + m[1] + '-' + m[2];
}
function daysUntil(birthday) { // 'MM-DD' → 距下次生日的天数
  const bd = toMMDD(birthday);
  const now = new Date();
  const [m, d] = bd.split('-').map(Number);
  if (!m || !d) return 1e9;
  /* 必须归一化到当天 0 点再比较：否则「生日就是今天」时 t(00:00) < now(含时分)
     会被判成已过，跳到下一年，导致当天永远显示 365 天、提醒永不触发。 */
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let t = new Date(now.getFullYear(), m - 1, d);
  if (t.getMonth() !== m - 1) t = new Date(now.getFullYear(), m - 1, 28); // 2/29 非闰年按 2/28 算
  if (t.getTime() < today.getTime()) {
    t = new Date(now.getFullYear() + 1, m - 1, d);
    if (t.getMonth() !== m - 1) t = new Date(now.getFullYear() + 1, m - 1, 28);
  }
  return Math.round((t - today) / DAY);
}
function initials(name) { return (name || '?').slice(0, 1); }


/* 农历转换（1900-2100，用于节日提醒） */
const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x25d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x5ac0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a4d0, 0x0d150, 0x0f252,
  0x0d520];
function lYearDays(y) { let s = 348; for (let i = 0x8000; i > 0x8; i >>= 1) s += (LUNAR_INFO[y - 1900] & i) ? 1 : 0; return s + lLeapDays(y); }
function lLeapMonth(y) { return LUNAR_INFO[y - 1900] & 0xf; }
function lLeapDays(y) { return lLeapMonth(y) ? ((LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29) : 0; }
function lMonthDays(y, m) { return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29; }
function solarToLunar(d) {
  const base = Date.UTC(1900, 0, 31);
  let off = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - base) / DAY);
  let y = 1900;
  while (off >= 0) { const yD = lYearDays(y); if (off < yD) break; off -= yD; y++; }
  const leap = lLeapMonth(y); let isLeap = false, m = 1;
  while (m <= 12) {
    const mD = (leap === m && isLeap) ? lLeapDays(y) : lMonthDays(y, m);
    if (off < mD) break; off -= mD;
    if (leap === m && !isLeap) { isLeap = true; } else { m++; isLeap = false; }
  }
  return { y, m, d: off + 1, leap: isLeap };
}
const FESTIVALS = [{ m: 1, d: 1, n: '春节' }, { m: 5, d: 5, n: '端午节' }, { m: 8, d: 15, n: '中秋节' }];
function upcomingFestival() {
  const now = new Date();
  for (let i = 0; i <= 7; i++) {
    const lu = solarToLunar(new Date(now.getTime() + i * DAY));
    for (const f of FESTIVALS) if (lu.m === f.m && lu.d === f.d) return { n: f.n, days: i };
  }
  return null;
}

/* ---------------- 2. 存储层（本机 localStorage，零依赖） ---------------- */

const EVENT_TYPES = {
  help_them: { label: '对方帮了我', dHeat: 6, dTrust: 6, dIntimacy: 4, dDebt: 8 },
  help_me:   { label: '我帮了对方', dHeat: 6, dTrust: 5, dIntimacy: 3, dDebt: -4 },
  meal:      { label: '饭局/聚会',  dHeat: 7, dTrust: 2, dIntimacy: 6, dDebt: 0 },
  gift_get:  { label: '收礼',       dHeat: 4, dTrust: 2, dIntimacy: 3, dDebt: 6 },
  gift_give: { label: '送礼',       dHeat: 4, dTrust: 2, dIntimacy: 3, dDebt: -3 },
  money:     { label: '金钱往来',   dHeat: 5, dTrust: 4, dIntimacy: 0, dDebt: 4 },
  talk:      { label: '谈心/深聊',  dHeat: 5, dTrust: 7, dIntimacy: 7, dDebt: 0 },
  greeting:  { label: '问候/祝福',  dHeat: 3, dTrust: 1, dIntimacy: 2, dDebt: 0 },
  conflict:  { label: '冲突/摩擦',  dHeat: -10, dTrust: -6, dIntimacy: -6, dDebt: 0 },
  other:     { label: '其他',       dHeat: 2, dTrust: 1, dIntimacy: 1, dDebt: 0 }
};
const PLACEHOLDERS = {
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
};


/* 计算一个人的五项雷达指标 */
function computePerson(p) {
  const evs = state.events.filter(e => e.personId === p.id);
  const now = Date.now();
  let heat = 50, trust = 40, intim = 35, debt = 0, lastTs = null;
  for (const ev of evs) {
    const days = (now - ev.time) / DAY;
    const ratio = Math.pow(0.5, days / 90);           // 90 天半衰期
    const t = EVENT_TYPES[ev.type] || EVENT_TYPES.other;
    /* 归一化到类型基准：必须保留 dHeat 的符号（与 Web 端一致），
       否则 conflict（dHeat<0）会反向升温。无基准或权重非法时按 1 倍计。 */
    const denom = Number.isFinite(t.dHeat) && t.dHeat !== 0 ? t.dHeat : 1;
    const w = Number.isFinite(ev.weight) ? ev.weight / denom : 1;
    heat += t.dHeat * ratio * w;
    trust += t.dTrust * ratio * w;
    intim += t.dIntimacy * ratio * w;
    debt += t.dDebt * ratio * w;
    if (!lastTs || ev.time > lastTs) lastTs = ev.time;
  }
  const lastDays = lastTs ? Math.max(0, Math.floor((now - lastTs) / DAY)) : null;
  const activity = lastTs ? clamp(100 - lastDays / 1.2, 5, 100) : 5;
  return {
    heat: clamp(heat + (p.adjust || 0), 0, 100),
    trust: clamp(trust, 0, 100),
    intimacy: clamp(intim, 0, 100),
    activity: Math.round(activity),
    debt: clamp(debt, 0, 100),
    lastDays, eventCount: evs.length
  };
}

/* ----- 计算缓存层 ----- */
let _computeCache = {}, _eventVersion = 0;
function invalidateCache() { _computeCache = {}; _eventVersion++; }
function computedFor(personId) {
  const c = _computeCache[personId];
  if (c && c.__v === _eventVersion) return c.result;
  const p = S.persons.find(x => x.id === personId);
  const r = p ? computePerson(p) : null;
  _computeCache[personId] = { result: r, __v: _eventVersion };
  return r;
}

/* 首页总览五维：人脉规模 / 人情热度 / 往来频率 / 人情信用 / 处世智慧 */
function overallMetrics() {
  const now = Date.now();
  const n = state.persons.length;
  if (!n) return null;
  const pms = state.persons.map(p => computedFor(p.id));
  const scale = clamp(n * 12, 5, 100);
  const heatAvg = avg(pms.map(p => p.heat));
  const n30 = state.events.filter(e => now - e.time < 30 * DAY).length;
  const freq = Math.round(100 * (1 - Math.exp(-n30 / 6))); // 软饱和：每笔都有增量，不封死
  const credit = clamp(100 - avg(pms.map(p => p.debt)), 0, 100);
  const wisdom = getWisdom();
  const index = Math.round(0.20 * scale + 0.25 * heatAvg + 0.20 * freq + 0.20 * credit + 0.15 * wisdom);
  return { scale, heatAvg, freq, credit, wisdom, index };
}

/* 处世智慧：情景修炼按难度加权后归一化到 0-100（与 Web 端同一算法）。
   满分为「全部情景都拿到 100 分」的加权总分，单题满分不会一次拉满段位。 */
const DIFFS = {
  入门: { w: 1, chip: 'chip teal' },
  进阶: { w: 1.25, chip: 'chip amber' },
  高手: { w: 1.5, chip: 'chip red' }
};
/* SCENARIOS 在下方声明，满分只能懒计算，避免模块初始化时 TDZ。 */
let _wisdomFull = 0;
function wisdomFull() {
  if (!_wisdomFull) _wisdomFull = SCENARIOS.reduce((sum, sc) => sum + 100 * DIFFS[sc.diff].w, 0);
  return _wisdomFull;
}
function getWisdom() {
  let s = 0;
  for (const k in state.progress) {
    const sc = SCENARIOS.find(x => x.id === k);
    const w = DIFFS[sc ? sc.diff : '入门'].w;
    s += state.progress[k].best * w;
  }
  const full = wisdomFull();
  if (!(full > 0)) return 0;
  return clamp(Math.round(s / full * 100), 0, 100);
}
const LEVELS = [
  { min: 0, name: '人情小白', desc: '刚入门，多留心身边人的感受' },
  { min: 15, name: '略懂世故', desc: '开始懂分寸，继续攒经验' },
  { min: 35, name: '人情通达', desc: '待人接物有章法，圈子越走越宽' },
  { min: 60, name: '人情大师', desc: '礼尚往来拿捏得当，左右逢源' },
  { min: 85, name: '人情宗师', desc: '世事洞明皆学问，人情练达即文章' }
];
function getLevel(w) {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (w >= l.min) cur = l;
  const nxt = LEVELS.find(l => l.min > cur.min);
  return { cur, nxt, pct: nxt ? Math.round((w - cur.min) / (nxt.min - cur.min) * 100) : 100 };
}

/* 智能提醒：节日 / 欠人情 / 久未往来 / 生日 / 待办 */
function buildAlerts() {
  const out = [];
  const now = Date.now();
  const fst = upcomingFestival();
  if (fst) out.push({ ic: 'fest', cls: 'blue', personId: '', text: `${fst.days === 0 ? '今天是' : fst.days + ' 天后是'}${fst.n}，记得给重要的人送个祝福、走动一下` });
  for (const p of state.persons) {
    const m = computedFor(p.id);
    if (m.debt >= 20) out.push({ ic: 'debt', cls: 'amber', personId: p.id, text: `<b>${esc(p.name)}</b>：你欠着人情债（${Math.round(m.debt)}），建议近期请顿饭或回个礼` });
    if (m.lastDays !== null && m.lastDays >= 60) out.push({ ic: 'stale', cls: 'red', personId: p.id, text: `<b>${esc(p.name)}</b>：已 ${m.lastDays} 天没往来，逢年过节走动一下` });
    if (p.birthday) {
      const d = daysUntil(p.birthday);
      if (d >= 0 && d <= 7) out.push({ ic: 'bday', cls: 'teal', personId: p.id, text: `<b>${esc(p.name)}</b>：生日${d === 0 ? '就是今天' : `还有 ${d} 天`}，记得送上祝福` });
    }
  }
  for (const r of state.reminders) {
    if (r.status === 'pending' && (!r.date || r.date <= todayStr()))
      out.push({ ic: 'todo', cls: 'blue', personId: r.personId, text: `待办：${esc(r.content)}`, reminderId: r.id });
  }
  /* 按紧急度排序：久未往来/欠人情 优先，生日/待办/节日 靠后 */
  const PRIO = { red: 0, amber: 1, teal: 2, blue: 3 };
  out.sort((a, b) => PRIO[a.cls] - PRIO[b.cls]);
  return out.slice(0, 8);
}

/* 走动建议（规则生成，不依赖外部 AI） */
function getSuggestion(p) {
  const m = computedFor(p.id);
  if (m.debt >= 20) return '人情要趁热还：找个由头约顿饭，开场提一句「上次那事多亏你」，顺手带点小特产，把债了了。';
  if (m.lastDays !== null && m.lastDays >= 60) return '别硬找话题：以问候破冰最自然——「最近忙啥呢，好久没聚了」，顺势约个饭或喝杯茶。';
  if (m.intimacy >= 70) return '关系正热，值得深化：约个球局或下午茶，聊点工作之外的事，让交情从「有事才联系」变成「没事也联系」。';
  if (m.lastDays === null) return '刚认识，别急着使劲：逢年过节一句问候、偶尔点赞互动，先自然熟络，再找机会深交。';
  return '保持节奏：隔一两周一句问候即可，不用刻意。关系是细水长流，不是突击任务。';
}

/* 关系解读：把雷达数据翻译成一句话（规则生成） */
function relationRead(p) {
  const m = computedFor(p.id);
  const seg = [];
  if (m.lastDays === null) seg.push('刚记进来，还没怎么走动');
  else if (m.lastDays >= 60) seg.push('有段时间没走动了');
  else seg.push('近期还在来往');
  if (m.intimacy >= 65) seg.push('关系挺亲，能交心');
  else if (m.intimacy >= 35) seg.push('关系不错，熟而不腻');
  else seg.push('还停留在客气阶段');
  if (m.debt >= 15) seg.push(`欠着人情（${Math.round(m.debt)}），记得还`);
  else if (m.debt > 0) seg.push('还略欠点人情，有空回个礼');
  /* debt 已被 clamp(0,100) 恒为非负，因此 else 分支只可能是 debt===0。
     旧文案「对方反而欠着你人情」是误报（与 Web 端已修复的同款 bug 保持一致）。 */
  else seg.push('人情账清清爽爽，互不亏欠');
  if (m.heat >= 70) seg.push('热度在线，趁热经营');
  else if (m.heat < 45) seg.push('热度偏低，多走动会回暖');
  return seg.join('，') + '。';
}


const SCENARIOS = [
  {
    id: 'wedding', diff: '入门', tag: '礼尚往来', title: '同事结婚，随多少礼？',
    scene: '关系一般的同事小周下月办婚礼，请了全部门。你月薪到手 8 千，同事们私下都在聊「随多少合适」。',
    choices: [
      { t: '随 200，人到场', s: 30, r: '明显低于一般行情，席间容易传成「抠门」，人情没攒到反落话柄。' },
      { t: '随当地一般行情（约 600），人到场', s: 90, r: '符合行情、体面不失分寸，同事关系平稳加分，日后对方也会念你的情。' },
      { t: '随 1000 打底', s: 55, r: '超出了你们关系的亲密度，对方收着有压力，你自己也肉疼，还抬高了下次的行情。' },
      { t: '随 300，说最近手头紧', s: 60, r: '略低于行情，关系一般的同事能接受，但面子上稍欠，至少别低于 500。' }
    ],
    tip: '随礼讲究「行情 + 关系」：先打听本地行情，再按亲疏加减。宁可到位，不要让人背后议论。'
  },
  {
    id: 'toast', diff: '进阶', tag: '饭局酒桌', title: '领导敬酒说「你随意」',
    scene: '部门聚餐，领导端着酒杯走到你面前：「我干了，你随意。」',
    choices: [
      { t: '真就随意抿一口', s: 35, r: '领导说「随意」是客气话，你全盘照收，他心里会嘀咕你不懂事。' },
      { t: '起身双手捧杯：「领导您这话我可不敢接，我先干为敬」，一口喝完', s: 90, r: '既给了领导面子，又显得懂规矩，饭局上最稳的一手。' },
      { t: '推辞说「我酒量真不行」', s: 50, r: '偶尔一次可以，但敬酒时驳面子是大忌，下次他未必再敬你。' },
      { t: '借机汇报最近的工作', s: 20, r: '饭局谈公事是场合大忌，领导会觉得你不分场合。' }
    ],
    tip: '敬酒是「给面子」的艺术：起身、双手、先干为敬，比说多少话都管用。'
  },
  {
    id: 'borrow', diff: '进阶', tag: '金钱往来', title: '多年不联系的老同学借钱',
    scene: '五年没联系的老同学阿强，昨晚突然微信找你借 1 万：「老哥周转一下，下月准还。」',
    choices: [
      { t: '二话不说直接转', s: 30, r: '多年不联系一开口就是钱，八成有坑；借出去的感情大概率跟着钱一起没了。' },
      { t: '先问用途和还款计划，说自己也不宽裕，量力借一部分，转账备注借款', s: 88, r: '顾了情面也保护了自己，备注留痕有据可依，对方也明白你的边界。' },
      { t: '直接拉黑', s: 35, r: '关系彻底断裂，万一对方真有事，你在圈子里也落个「不近人情」。' },
      { t: '假装没看见，不回复', s: 45, r: '对方大概率知道你在装，拖得越久越记恨你。' }
    ],
    tip: '借钱看三样：关系深浅、用途真假、还款能力。借出去就当送，留好凭证；不借就明确说难处，别玩消失。'
  },
  {
    id: 'marriage', diff: '进阶', tag: '家庭饭桌', title: '亲戚催婚，怎么接？',
    scene: '春节饭桌上，三姨又开始了：「都 28 了还不找对象？你妈头发都急白了！」',
    choices: [
      { t: '冷脸怼回去「关您什么事」', s: 20, r: '场面瞬间尴尬，长辈觉得你不懂事，爸妈也跟着难做。' },
      { t: '笑呵呵打太极：「哎呀我也急呀，缘分没到嘛。三姨，您当年是怎么遇到三姨父的？」顺势把话题抛回去', s: 92, r: '既没翻脸，又把焦点转移到对方身上，长辈还觉得你情商高。' },
      { t: '低头扒饭不说话', s: 50, r: '不回应也算得体，但全程闷着容易显得轴。' },
      { t: '认真解释自己为什么不想结婚', s: 40, r: '长辈不是来听理由的，你解释得越认真，越容易引出一连串说教。' }
    ],
    tip: '催婚应对的核心是「不接招」：笑着接话、转移话题、夸回对方，三招用完自然翻篇。'
  },
  {
    id: 'gossip', diff: '进阶', tag: '职场人情', title: '同事在你面前说别人坏话',
    scene: '茶水间，同事小美凑过来：「你不觉得老刘特别会拍马屁吗？天天往总监办公室跑。」',
    choices: [
      { t: '跟着附和两句', s: 30, r: '话传到老刘耳朵里，你就成了嚼舌根的同伙，两个人都得罪。' },
      { t: '立刻反驳「他不是那种人」', s: 45, r: '够义气，但容易把场面搞僵，还显得你在护短。' },
      { t: '笑着岔开：「先不说这个。老刘其实挺靠谱，上次还帮我顶了个班。」轻描淡写给台阶', s: 90, r: '不接坏话、顺手补一句好话，既保护了别人，也显得你大度。' },
      { t: '转身就去告诉老刘', s: 25, r: '传话的人会恨你入骨，你成了最危险的内奸。' }
    ],
    tip: '听到坏话，最高段位是「不接、不传、补一句好话」。宁可当没听见，也别当传声筒。'
  },
  {
    id: 'paybill', diff: '入门', tag: '饭局酒桌', title: '你组的局，谁买单？',
    scene: '你组的局，叫了两个朋友吃火锅，结账时服务员把单递了过来。',
    choices: [
      { t: '低头看手机，等别人接单', s: 30, r: '你组的局不买单，朋友嘴上不说，心里给你记一笔。' },
      { t: '主动买单：「今天是我组的局，我来！下次轮到你们。」', s: 92, r: '组局买单是约定俗成，主动一点显大气，下次别人自然会回请。' },
      { t: '当场提议 AA', s: 55, r: '平辈朋友之间可以，但有长辈或领导在场绝对不行，会显得小气。' },
      { t: '借口上厕所躲单', s: 10, r: '一次躲单，圈子里传开，你的人设就崩了。' }
    ],
    tip: '买单原则：谁组局谁买，或轮流坐庄。可以抢单，但别躲单。'
  },
  {
    id: 'weekend', diff: '高手', tag: '职场人情', title: '领导周五晚上让你周末加班',
    scene: '周五晚上 9 点，领导发消息：「周六那个方案要改，你辛苦一下。」而你明天已有安排。',
    choices: [
      { t: '秒回「领导，我明天有事来不了」', s: 30, r: '直接拒绝最伤关系，领导只会觉得你不扛事。' },
      { t: '先接住再谈条件：「领导，周六上午我有件重要的家事，我先在家改一版，下午给您过目，可以吗？」', s: 90, r: '先接受再讲困难，既给了领导台阶，又守住自己的安排，还显得靠谱。' },
      { t: '答应下来，然后消极怠工', s: 35, r: '拖到周日晚上交，质量差还被记一笔「不主动」。' },
      { t: '发朋友圈吐槽', s: 10, r: '领导同事都看得见，情商直接清零。' }
    ],
    tip: '拒绝的艺术：先接、再谈、给替代方案。让领导觉得你「尽力了」，比争论对错有用。'
  },
  {
    id: 'praise', diff: '入门', tag: '职场人情', title: '领导当众夸你，怎么接？',
    scene: '部门会上，总监当众夸你：「这个季度就你项目推进得最漂亮。」',
    choices: [
      { t: '「哪里哪里，我差得远」', s: 70, r: '标准谦虚，不出错，但过度否定自己略显客套。' },
      { t: '「谢谢总监，我也觉得自己挺棒」', s: 55, r: '太实在了，中国人语境下显得不谦虚。' },
      { t: '「多亏您平时把关，我跟您比还差得远，还得跟您多学」', s: 95, r: '谦虚 + 回捧对方，段位最高，全场都觉得你会来事。' },
      { t: '尴尬地摆手不说话', s: 45, r: '白白浪费一次在领导面前展示的机会。' }
    ],
    tip: '被夸时：先谢，再归功于对方或团队，最后补一句「还得努力」。三分真七分谦。'
  },
  {
    id: 'thanks', diff: '进阶', tag: '礼尚往来', title: '朋友帮了大忙，怎么谢？',
    scene: '你托老同学帮你搞定了一个很难的渠道资源，对方跑前跑后办成了。',
    choices: [
      { t: '微信上连说三句「太谢谢了」', s: 40, r: '口头谢是基础，但中国式人情讲究「实际表示」，空口谢会被认为不懂事。' },
      { t: '发个 88 红包', s: 55, r: '心意到了，但金额难拿捏，像「交易」，对方未必愿意收。' },
      { t: '请吃一顿饭，席间说「这次多亏你，下次你有事吱一声」，之后他需要时主动帮回去', s: 92, r: '饭局是中国式人情最好的载体，加上「下次我帮你」，人情就流动起来了。' },
      { t: '记在心里，等下次他求你你再还', s: 45, r: '人情拖着不还，对方心里会有疙瘩，还人情要趁热。' }
    ],
    tip: '人情要「趁热还」：一顿饭、一份心意、一次主动帮忙，都比一句「谢谢」值钱。'
  },
  {
    id: 'gift', diff: '进阶', tag: '礼尚往来', title: '送礼被拒，怎么办？',
    scene: '你提着两盒茶叶去拜访一位帮过你的前辈，对方摆手：「小X啊，你这是干什么，拿回去拿回去。」',
    choices: [
      { t: '硬塞：「一点小意思，您务必收下」', s: 40, r: '送礼被拒还硬推，会让对方警惕，反而把关系推远。' },
      { t: '顺势放下，笑着说：「前辈您别误会，就是老家带的土特产，大家尝尝鲜」，转身自然离开', s: 88, r: '把「礼」降级成「分享」，降低对方心理负担，既给了心意又不显功利。' },
      { t: '觉得被驳面子，脸色一沉转身就走', s: 25, r: '送礼求的是心意，这点气度都没有，更显得目的性强。' },
      { t: '回去发微信追问「那个茶叶收到了吗」', s: 20, r: '送礼最忌讳问收没收到，太像交易。' }
    ],
    tip: '送礼心法：「轻描淡写」。把礼物说成特产、顺手带的，对方没有负担，人情反而记下了。'
  },
  {
    id: 'refuse', diff: '进阶', tag: '职场人情', title: '同事求你帮忙，你不想帮',
    scene: '同事小美周五晚上找你：「求求你帮我改下 PPT，我实在搞不定了，周一就要交。」你自己手头还有三个方案没写。',
    choices: [
      { t: '硬着头皮答应，然后熬夜赶两份活', s: 40, r: '你帮了这次，下次她还会找你；自己的活耽误了，两头不讨好。' },
      { t: '直接说「我自己的活都干不完」', s: 35, r: '实话实说没错，但语气太硬，同事关系容易结疙瘩。' },
      { t: '委婉拒绝并给替代方案：「我这两天真排不开，你要不先问问老刘？他上周刚做过类似的。我顺便教你个模板，半小时能搞定。」', s: 92, r: '拒绝给理由、给台阶、给替代路径，帮了又不全帮，最得体。' },
      { t: '表面答应，拖到周日才说「哎呀真没时间了」', s: 20, r: '既失信又得罪人，比一开始拒绝还伤关系。' }
    ],
    tip: '拒绝的公式：接住情绪 → 说明难处 → 给替代方案。让人知道你帮不了，但愿意想办法。'
  },
  {
    id: 'drink', diff: '进阶', tag: '饭局酒桌', title: '被起哄灌酒，怎么办？',
    scene: '饭局进行到一半，同事起哄：「老X今天高兴，再来三杯！」你已经明显到量了，头开始发晕。',
    choices: [
      { t: '来者不拒，硬喝三杯', s: 25, r: '面子是给足了，但万一喝出事，受罪的还是你自己，领导也会觉得你不知节制。' },
      { t: '当场翻脸「说了不能喝就不喝」', s: 20, r: '桌上气氛瞬间结冰，比少喝三杯更伤感情。' },
      { t: '笑着接住：「哥几个给面子我懂，但今晚真到量了，我以茶代酒敬大家一轮，改天一定补上！」起身敬一圈茶', s: 90, r: '既不驳面子，又守住底线，还显得会来事。' },
      { t: '装醉趴桌上', s: 45, r: '躲得了一时，下次大家更爱拿你开玩笑，还可能落下「装」的口碑。' }
    ],
    tip: '挡酒的要点：把「不能喝」包装成「改天补上」+ 当场以茶代酒敬回去。面子给足，量自己守。'
  },
  {
    id: 'blinddate', diff: '高手', tag: '家庭饭桌', title: '相亲对象加了微信，怎么开场？',
    scene: '长辈给你介绍了个对象，微信通过了，对面发来一句：「你好，我是王姨介绍的。」',
    choices: [
      { t: '回「嗯，你好。」然后没了下文', s: 35, r: '一句话把天聊死，长辈那边也不好交代。' },
      { t: '秒回一大段自我介绍和家庭情况', s: 40, r: '太用力，像查户口，对方压力很大。' },
      { t: '轻松接住：「你好你好，王姨跟我念叨你好几次了，说你人特别好。她这介绍人当得比我们俩都积极。」顺势抛个话题', s: 90, r: '开场自然、幽默、给双方台阶，还顺势把话题递了回去。' },
      { t: '直接问「你工资多少？有房吗？」', s: 10, r: '相亲大忌，一次就把人吓跑。' }
    ],
    tip: '相亲开场三不要：别查户口、别尬聊、别过度热情。轻松接话 + 顺势抛话题，让对方有话可接。'
  },
  {
    id: 'saveface', diff: '高手', tag: '职场人情', title: '饭局冷场，怎么救？',
    scene: '饭局上，同事喝多了说秃噜嘴：「咱们总监那点水平，还不如我。」全场瞬间安静，所有人的目光都看向你。',
    choices: [
      { t: '跟着起哄「就是就是」', s: 20, r: '话传到总监耳朵里，你俩都得完蛋。' },
      { t: '假装没听见，低头吃菜', s: 50, r: '不接是最好的止损，但气氛还是尴尬，可以更主动一点。' },
      { t: '笑着一杯酒带过去：「哥喝多了说胡话，我替他罚一杯！总监平时对咱们是真上心，上回我那个项目全靠他把关。」', s: 92, r: '既兜住了同事的醉话，又顺带夸了总监，一石二鸟。' },
      { t: '当场纠正他「你说什么呢」', s: 45, r: '虽然占理，但酒桌上较真只会让场面更难看。' }
    ],
    tip: '救场 = 兜话 + 转移 + 补好话。别人说错话时，帮他圆回来就是给全桌留面子，大家都会记你的情。'
  },
  {
    id: 'redpacket', diff: '入门', tag: '礼尚往来', title: '群里红包你手气最佳，怎么表态？',
    scene: '部门群里，领导发了个红包，你抢到了 88 块，群里刷了一堆「谢谢老板」的表情包。',
    choices: [
      { t: '默默收下，一句话不说', s: 45, r: '不吭声显得不懂礼，下回领导可能就不发了。' },
      { t: '立刻发一句「谢谢老板！」', s: 70, r: '基本礼仪到位，但可以更好。' },
      { t: '回一句「谢谢老板！老板发财！」再转手在群里发一个 66 的红包，说「沾沾喜气，给大家分分」', s: 90, r: '收了再散出去，既热闹了气氛，又让领导觉得你会做人。' },
      { t: '追着说「老板再发一个」', s: 30, r: '没分寸，一次就败好感。' }
    ],
    tip: '红包礼仪：领了要表态；手气最佳时「收了再散」是最高段位——热闹了群，还了情，谁也不欠。'
  }
];


/* ---------------- 存储层（wx 本地缓存） ---------------- */
const DB_KEY = 'eqworker_mp_v1';
const LEGACY_DB_KEY = 'rqsg_radar_v2';
function _empty() { S.persons = []; S.events = []; S.reminders = []; S.progress = {}; S.streak = { n: 0, last: '' }; S.lastEventId = null; S.settings = { giftTier: 'standard', cityTier: '二线' }; }

/* 导入/本地缓存清洗（与 Web 端 sanitizeImport 同源逻辑）：
   外部 JSON 一律视为不可信，逐字段校验。不清洗的后果都是真实可触发的：
   events 不是数组 → filter 抛错；progress.best 非数字 → 段位与百分比 NaN → 页面白屏。 */
function sanitizeImport(d) {
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  const num = (x, def) => (typeof x === 'number' && isFinite(x)) ? x : def;
  const str = (x, max) => (typeof x === 'string' ? x.slice(0, max) : '');
  const mmdd = (x) => {
    const s = str(x, 10);
    const m = s.match(/^(?:\d{4}-)?(\d{2})-(\d{2})$/);
    return m ? m[1] + '-' + m[2] : '';
  };
  /* 事件人情值：缺省取类型基准；负向事件（dHeat<0）强制为负，
     修复旧版记录冲突时 weight 恒为 +7 的历史数据。 */
  const fixWeight = (type, w) => {
    const t = EVENT_TYPES[type] || EVENT_TYPES.other;
    let n = num(w, t.dHeat);
    if (t.dHeat < 0 && n > 0) n = -n;
    return n;
  };
  const fixDir = (type, dir, amount) => {
    if (!(amount > 0)) return 'none';
    if (dir === 'in' || dir === 'out') return dir;
    if (type === 'gift_get') return 'in';
    if (type === 'gift_give') return 'out';
    if (type === 'money') return 'in';
    return 'none';
  };
  const persons = (Array.isArray(d.persons) ? d.persons : [])
    .filter(p => isObj(p) && typeof p.name === 'string' && p.name.trim())
    .map(p => ({
      id: typeof p.id === 'string' && p.id ? p.id : uid(),
      name: str(p.name, 60),
      identity: str(p.identity, 40),
      tags: Array.isArray(p.tags) ? p.tags.filter(t => typeof t === 'string').map(t => t.slice(0, 20)).slice(0, 10) : [],
      birthday: mmdd(p.birthday),
      anniversary: mmdd(p.anniversary),
      likes: str(p.likes, 200),
      taboos: str(p.taboos, 200),
      note: str(p.note, 500),
      adjust: num(p.adjust, 0),
      createdAt: num(p.createdAt, Date.now())
    }));
  const events = (Array.isArray(d.events) ? d.events : [])
    .filter(e => isObj(e) && typeof e.type === 'string' && num(e.time, 0) > 0)
    .map(e => {
      const amount = Math.max(0, Math.min(10000000, num(e.amount, 0)));
      return {
        id: typeof e.id === 'string' && e.id ? e.id : uid(),
        personId: str(e.personId, 40),
        type: e.type,
        title: str(e.title, 80),
        time: num(e.time, Date.now()),
        weight: fixWeight(e.type, e.weight),
        note: str(e.note, 500),
        amount,
        dir: fixDir(e.type, e.dir, amount),
        occasion: str(e.occasion, 20)
      };
    });
  const reminders = Array.isArray(d.reminders)
    ? d.reminders.filter(r => isObj(r)).map(r => ({
        id: typeof r.id === 'string' && r.id ? r.id : uid(),
        personId: str(r.personId, 40),
        content: str(r.content, 200),
        date: str(r.date, 20),
        status: r.status === 'done' ? 'done' : 'pending'
      }))
    : [];
  const rawProg = isObj(d.progress) ? d.progress : {};
  const progress = {};
  for (const k of Object.keys(rawProg)) {
    const v = rawProg[k];
    if (isObj(v)) progress[k] = { best: num(v.best, 0), times: num(v.times, 0) };
  }
  const st = isObj(d.streak) ? d.streak : {};
  const streak = { n: num(st.n, 0), last: str(st.last, 20) };
  const rawSet = isObj(d.settings) ? d.settings : {};
  const settings = {
    giftTier: ['simple', 'standard', 'generous'].indexOf(rawSet.giftTier) >= 0 ? rawSet.giftTier : 'standard',
    cityTier: ['三线', '二线', '一线'].indexOf(rawSet.cityTier) >= 0 ? rawSet.cityTier : '二线'
  };
  return { persons, events, reminders, progress, streak, settings };
}

function load() {
  try {
    let raw = wx.getStorageSync(DB_KEY);
    if (!raw) raw = wx.getStorageSync(LEGACY_DB_KEY);
    if (!raw) { _empty(); invalidateCache(); return S; }
    const d = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!d || !Array.isArray(d.persons)) { _empty(); invalidateCache(); return S; }
    const clean = sanitizeImport(d);
    S.persons = clean.persons; S.events = clean.events; S.reminders = clean.reminders;
    S.progress = clean.progress; S.streak = clean.streak; S.settings = clean.settings;
    S.lastEventId = typeof d.lastEventId === 'string' ? d.lastEventId : null;
    invalidateCache();
    return S;
  } catch (e) { _empty(); invalidateCache(); return S; }
}
function save() {
  try { wx.setStorageSync(DB_KEY, { schema: SCHEMA_VERSION, ...S }); } catch (e) { wx.showToast({ title: '保存失败', icon: 'none' }); }
  invalidateCache();
}
function getState() { return S; }
function backupText() { return JSON.stringify({ app: 'EQ-Worker', version: 3, exportedAt: Date.now(), persons: S.persons, events: S.events, reminders: S.reminders, progress: S.progress, streak: S.streak, settings: S.settings }, null, 1); }
function restoreText(txt) {
  const d = JSON.parse(txt);
  if (!d || !Array.isArray(d.persons)) throw new Error('bad');
  const clean = sanitizeImport(d);
  S.persons = clean.persons; S.events = clean.events; S.reminders = clean.reminders;
  S.progress = clean.progress; S.streak = clean.streak; S.settings = clean.settings;
  S.lastEventId = typeof d.lastEventId === 'string' ? d.lastEventId : null;
  save();
  invalidateCache();
  return S;
}
/* ---------------- 小程序版提醒（纯文本） ---------------- */
function wxAlerts() {
  const out = [];
  const fst = upcomingFestival();
  if (fst) out.push({ icon: 'fest', level: 3, personId: '', text: (fst.days === 0 ? '今天是' : fst.days + ' 天后是') + fst.n + '，记得给重要的人送个祝福、走动一下' });
  for (const p of S.persons) {
    const m = computedFor(p.id);
    if (m.debt >= 20) out.push({ icon: 'debt', level: 1, personId: p.id, text: p.name + '：你欠着人情债（' + Math.round(m.debt) + '），建议近期请顿饭或回个礼' });
    if (m.lastDays !== null && m.lastDays >= 60) out.push({ icon: 'stale', level: 0, personId: p.id, text: p.name + '：已 ' + m.lastDays + ' 天没往来，逢年过节走动一下' });
    if (p.birthday) {
      const d = daysUntil(p.birthday);
      if (d >= 0 && d <= 7) out.push({ icon: 'bday', level: 2, personId: p.id, text: p.name + '：生日' + (d === 0 ? '就是今天' : '还有 ' + d + ' 天') + '，记得送上祝福' });
    }
  }
  for (const r of S.reminders) {
    if (r.status === 'pending' && (!r.date || r.date <= todayStr()))
      out.push({ icon: 'todo', level: 3, personId: r.personId, text: '待办：' + r.content, reminderId: r.id });
  }
  out.sort((a, b) => a.level - b.level);
  return out.slice(0, 8);
}
/* ---------------- 月度 / 年度 / 趋势 数据 ---------------- */
function monthData() {
  const now = new Date();
  const ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const mev = S.events.filter(e => fmtDate(e.time).startsWith(ym));
  const byPerson = {};
  for (const e of mev) byPerson[e.personId] = (byPerson[e.personId] || 0) + 1;
  const top = Object.entries(byPerson).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([id, n]) => { const p = S.persons.find(x => x.id === id); return p ? p.name + ' ' + n + ' 笔' : ''; })
    .filter(Boolean).join('、') || '暂无';
  const debts = S.persons.map(p => ({ p, m: computedFor(p.id) }))
    .filter(x => x.m.debt > 0).sort((a, b) => b.m.debt - a.m.debt).slice(0, 3)
    .map(x => x.p.name + ' ' + Math.round(x.m.debt)).join('、') || '暂无欠债';
  const np = S.persons.filter(p => fmtDate(p.createdAt || 0).startsWith(ym)).length;
  return { count: mev.length, top, debts, np, ym };
}
function trendData(n) {
  const now = new Date();
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    months.push({ label: (d.getMonth() + 1) + '月', c: S.events.filter(e => fmtDate(e.time).startsWith(ym)).length });
  }
  return months;
}
function annualData() {
  const months = trendData(12);
  const total = months.reduce((s, x) => s + x.c, 0);
  const yStart = fmtDate(Date.now() - 365 * DAY).slice(0, 7) + '-01';
  const byPerson = {};
  for (const e of S.events) if (fmtDate(e.time) >= yStart) byPerson[e.personId] = (byPerson[e.personId] || 0) + 1;
  const top = Object.entries(byPerson).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([id, n]) => { const p = S.persons.find(x => x.id === id); return p ? p.name + ' ' + n + ' 笔' : ''; })
    .filter(Boolean) || [];
  const debts = S.persons.map(p => ({ p, m: computedFor(p.id) }))
    .filter(x => x.m.debt > 0).sort((a, b) => b.m.debt - a.m.debt).slice(0, 3)
    .map(x => x.p.name + ' ' + Math.round(x.m.debt)).join('、') || '暂无欠债';
  const w = getWisdom(), lv = getLevel(w);
  const peak = Math.max.apply(null, months.map(x => x.c).concat([1]));
  const bestM = months.filter(x => x.c === peak).map(x => x.label).join('、');
  const kw = [];
  if (total === 0) kw.push('这一年的往来还是一张白纸，从记录第一笔开始');
  else if (total >= 60) kw.push('走动很勤，是圈子里的人脉活跃分子');
  else if (total >= 20) kw.push('保持了节奏，关系细水长流');
  else kw.push('往来偏少，明年可以多走动');
  if (w >= 60) kw.push('修炼有成，已迈入人情大师');
  else if (w >= 15) kw.push('修炼起步，已略懂世故');
  if (debts !== '暂无欠债') kw.push('人情债榜首是「' + debts.split('、')[0] + '」，记得还');
  return { months, total, top, debts, w, levelName: lv.cur.name, peak, bestM, kw };
}
module.exports = {
  load, save, getState, backupText, restoreText,
  uid, DAY, todayStr, fmtDate, timeAgo, toMMDD, toDateInput, daysUntil, initials, sanitizeImport,
  solarToLunar, upcomingFestival,
  EVENT_TYPES, PLACEHOLDERS, IDENTITIES: ['领导', '同事', '客户', '朋友', '家人', '长辈', '其他'],
  SCHEMA_VERSION, computePerson, computedFor, invalidateCache,
  overallMetrics, getWisdom, getLevel, DIFFS, LEVELS,
  buildAlerts: wxAlerts, getSuggestion, relationRead,
  SCENARIOS, monthData, trendData, annualData
};
