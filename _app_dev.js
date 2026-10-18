/* ===================================================================
 * 人情世故雷达 v2 · 应用逻辑
 * 分层：工具层 → 存储层 → 人情计算引擎 → 情景库 → 视图渲染 → 交互
 * =================================================================== */
'use strict';

/* ---------------- 1. 工具层 ---------------- */
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const DAY = 86400000;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* 品牌（Logo / 名称 / Slogan 统一出口） */
const LOGO_SVG = `<svg viewBox="0 0 32 32" fill="none"><path d="M16 3 29 16 16 29 3 16Z" stroke="#5f8575" stroke-width="1.8" stroke-linejoin="round" fill="rgba(95,133,117,.10)"/><path d="M16 9.5 23 16l-7 6.5L9 16z" stroke="#9cbfa8" stroke-width="1.2" stroke-linejoin="round"/><path d="M5 20.5c6-7.5 16-7.5 22 0" stroke="#c9a86a" stroke-width="1.8" stroke-linecap="round"/><circle cx="16" cy="16" r="2.2" fill="#5f8575" stroke="none"/></svg>`;
const BRAND = { name: '人情世故雷达', slogan: '把人情账记明白，把关系经营成细水长流', en: 'RENQING · RADAR', version: 'v2.8' };

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
const DB_KEY = 'rqsg_radar_v2';
const SCHEMA_VERSION = 3;

/* localStorage 安全包装：Safari 隐私模式 / 禁用站点数据 / iframe 沙箱下，直接访问
   localStorage 会抛 SecurityError。init() 里裸调用会让启动中断、整页白屏。
   这里统一兜底：读写失败时降级为内存存储，保证功能可用（仅本次会话不持久）。 */
const _memStore = {};
function lsGet(k) {
  try { const v = localStorage.getItem(k); return (v === null || v === undefined) ? (_memStore[k] ?? null) : v; }
  catch (e) { return _memStore[k] ?? null; }
}
function lsSet(k, v) {
  _memStore[k] = v;
  try { localStorage.setItem(k, v); return true; } catch (e) { return false; }
}
function lsHas(k) { return lsGet(k) !== null; }

/* 导入数据清洗：外部 JSON 一律视为不可信，逐字段校验并修正。
   不做清洗的后果（都是真实可触发的）：
   - events 不是数组 → 后续 state.events.filter 抛错
   - progress.best 不是数字 → 指数/段位变 NaN → 进度条 width:NaN% → 整页白屏且无恢复入口
   - 缺 id / 类型错乱 → 卡片渲染异常、删除与撤销失效 */
function sanitizeImport(d) {
  const warn = [];
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  const num = (x, def) => (typeof x === 'number' && isFinite(x)) ? x : def;
  const str = (x, max) => (typeof x === 'string' ? x.slice(0, max) : '');

  let persons = Array.isArray(d.persons) ? d.persons : [];
  const nP = persons.length;
  persons = persons
    .filter(p => isObj(p) && typeof p.name === 'string' && p.name.trim())
    .map(p => ({
      id: typeof p.id === 'string' && p.id ? p.id : uid(),
      name: str(p.name, 60),
      identity: str(p.identity, 40),
      tags: Array.isArray(p.tags) ? p.tags.filter(t => typeof t === 'string').map(t => t.slice(0, 20)).slice(0, 10) : [],
      birthday: str(p.birthday, 10),
      note: str(p.note, 500),
      adjust: num(p.adjust, 0),
      createdAt: num(p.createdAt, Date.now())
    }));
  if (nP !== persons.length) warn.push('人脉 ' + (nP - persons.length) + ' 条');

  let events = Array.isArray(d.events) ? d.events : [];
  const nE = events.length;
  events = events
    .filter(e => isObj(e) && typeof e.type === 'string' && num(e.time, 0) > 0)
    .map(e => ({
      id: typeof e.id === 'string' && e.id ? e.id : uid(),
      personId: str(e.personId, 40),
      type: e.type,
      title: str(e.title, 80),
      time: num(e.time, Date.now()),
      weight: num(e.weight, 6),
      note: str(e.note, 500)
    }));
  if (nE !== events.length) warn.push('往来 ' + (nE - events.length) + ' 条');

  const reminders = Array.isArray(d.reminders)
    ? d.reminders.filter(r => isObj(r)).map(r => ({
        id: typeof r.id === 'string' && r.id ? r.id : uid(),
        personId: str(r.personId, 40),
        content: str(r.content, 200),
        date: str(r.date, 20),
        status: r.status === 'done' ? 'done' : 'pending'
      }))
    : [];

  /* progress.best 必须是有限数字：否则段位与百分比会变成 NaN */
  const rawProg = isObj(d.progress) ? d.progress : {};
  const progress = {};
  for (const k of Object.keys(rawProg)) {
    const v = rawProg[k];
    if (isObj(v)) progress[k] = { best: num(v.best, 0), times: num(v.times, 0) };
  }

  const st = isObj(d.streak) ? d.streak : {};
  const streak = { n: num(st.n, 0), last: str(st.last, 20) };

  return {
    persons, events, reminders, progress, streak, warn,
    schemaMismatch: (typeof d.schema === 'number' && d.schema !== SCHEMA_VERSION)
  };
}
const store = {
  load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (!d || !Array.isArray(d.persons)) return false;
      state.persons = (d.persons || []).filter(p => p && typeof p.name === 'string' && p.name.trim());
      state.events = (d.events || []).filter(e => e && typeof e.type === 'string' && (e.time > 0));
      state.reminders = d.reminders || [];
      state.progress = d.progress || {};
      state.streak = d.streak || { n: 0, last: '' };
      return true;
    } catch (e) { return false; }
  },
  save() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify({
        schema: SCHEMA_VERSION,
        persons: state.persons, events: state.events,
        reminders: state.reminders, progress: state.progress,
        streak: state.streak
      }));
    } catch (e) { toast('保存失败：本地存储空间不足'); }
  },
  export() {
    const blob = new Blob([JSON.stringify({
      app: '人情世故雷达', version: 2, exportedAt: Date.now(),
      persons: state.persons, events: state.events,
      reminders: state.reminders, progress: state.progress,
      streak: state.streak
    }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `人情世故雷达备份-${todayStr()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  exportCsv() { // 人脉清单 CSV，Excel/WPS 可直接打开
    const rows = [['姓名', '身份', '标签', '生日', '备注', '热度', '往来笔数', '最后往来']];
    for (const p of state.persons) {
      const m = computedFor(p.id);
      const last = state.events.filter(e => e.personId === p.id).reduce((mx, e) => Math.max(mx, e.time), 0);
      rows.push([p.name, p.identity || '', (p.tags || []).join('；'), p.birthday || '', p.note || '',
        Math.round(m.heat), m.eventCount, last ? fmtDate(last) : '']);
    }
    /* CSV 公式注入防护：Excel/WPS 会把以 = + - @ 开头的单元格当公式执行
       （例如备注写成 =HYPERLINK(...) 或 =cmd|... 会变成攻击载荷）。
       统一前置单引号强制按文本处理，同时保留原有双引号转义。 */
    const cell = (v) => {
      let s = String(v == null ? '' : v);
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const csv = '\ufeff' + rows.map(r => r.map(cell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `人情世故雷达-人脉清单-${todayStr()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  import(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let d;
      try { d = JSON.parse(reader.result); }
      catch (e) { toast('导入失败：不是合法的 JSON 文件'); return; }
      if (!d || typeof d !== 'object' || !Array.isArray(d.persons)) { toast('导入失败：文件格式不对（缺少 persons）'); return; }
      const clean = sanitizeImport(d);
      const apply = () => store.applyImport(clean);
      if (state.persons.length) {
        confirmModal('导入会覆盖当前所有数据（建议先导出备份）。确定继续吗？', apply, true);
      } else { apply(); }
    };
    reader.onerror = () => toast('导入失败：文件读取失败');
    reader.readAsText(file);
  },
  applyImport(clean) {
    state.persons = clean.persons;
    state.events = clean.events;
    state.reminders = clean.reminders;
    state.progress = clean.progress;
    state.streak = clean.streak;
    state.lastEventId = null; state.filter = ''; state.identity = 'all'; state.sortBy = 'heat'; state.trainDiff = '全部';
    invalidateCache(); store.save(); render();
    let msg = '导入成功，共 ' + state.persons.length + ' 位人脉';
    if (clean.warn.length) msg += '（已过滤无效：' + clean.warn.join('、') + '）';
    if (clean.schemaMismatch) msg += '（数据结构版本不同，已按当前版本兼容处理）';
    toast(msg);
  }
};

/* ---------------- 3. 人情计算引擎（带缓存） ---------------- */
/* 计算缓存：computePerson 结果按 personId 缓存，事件变更时失效 */
let _computeCache = {}; // personId → {result, eventVersion}
let _eventVersion = 0;   // 事件全局版本号，增删事件时 +1
function invalidateCache() { _computeCache = {}; _eventVersion++; }
function computedFor(personId) {
  const c = _computeCache[personId];
  if (c && c.__v === _eventVersion) return c.result;
  const p = state.persons.find(x => x.id === personId);
  const r = p ? computePerson(p) : null;
  _computeCache[personId] = { result: r, __v: _eventVersion };
  return r;
}

/* 事件类型：每个事件影响 热度/信任/亲密/人情债 四个维度，随时间按半衰期衰减（90 天减半） */
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

/* 计算一个人的五项雷达指标（纯函数，不直接调用——外部统一走 computedFor ） */
function computePerson(p) {
  const evs = state.events.filter(e => e.personId === p.id);
  const now = Date.now();
  let heat = 50, trust = 40, intim = 35, debt = 0, lastTs = null;
  for (const ev of evs) {
    const days = (now - ev.time) / DAY;
    const ratio = Math.pow(0.5, days / 90);           // 90 天半衰期
    const t = EVENT_TYPES[ev.type] || EVENT_TYPES.other;
    /* 归一化到类型基准：必须保留 dHeat 的符号，否则 conflict（dHeat<0）会导致
       热度/信任/亲密反向增长（记一次冲突反而升温）。无基准或权重非法时按 1 倍计。 */
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

/* 处世智慧：情景修炼累计（按难度加成，封顶 100） */
const DIFFS = {
  入门: { w: 1, chip: 'chip teal' },
  进阶: { w: 1.25, chip: 'chip amber' },
  高手: { w: 1.5, chip: 'chip red' }
};
function getWisdom() {
  let s = 0;
  for (const k in state.progress) {
    const sc = SCENARIOS.find(x => x.id === k);
    const w = DIFFS[sc ? sc.diff : '入门'].w;
    s += state.progress[k].best * w;
  }
  return clamp(Math.round(s), 0, 100);
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
  else seg.push('人情账清清爽爽，互不亏欠');
  if (m.heat >= 70) seg.push('热度在线，趁热经营');
  else if (m.heat < 45) seg.push('热度偏低，多走动会回暖');
  return seg.join('，') + '。';
}

/* ---------------- 4. 情景库（人情修炼场） ---------------- */
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

/* ---------------- 5. 状态与全局 ---------------- */
const state = {
  tab: 'radar',
  persons: [], events: [], reminders: [], progress: {},
  filter: '', identity: 'all', sortBy: 'heat', trainDiff: '全部',
  lastEventId: null,
  evType: 'meal', evPersonId: null,
  streak: { n: 0, last: '' }
};
const IDENTITIES = ['领导', '同事', '客户', '朋友', '家人', '长辈', '其他'];
let chartInstances = [];

/* 自定义确认弹层（替代原生 confirm，保持日记本文风） */
function confirmModal(message, onConfirm, danger) {
  $('#modal-root').innerHTML = `
    <div class="mask center" role="dialog" aria-modal="true">
      <div class="sheet center" style="max-width:340px">
        <div class="sbody" style="padding:22px 16px 16px;text-align:center">
          <div style="font-size:15px;line-height:1.7;color:var(--text);margin-bottom:18px">${esc(message)}</div>
          <div style="display:flex;gap:10px">
            <button class="btn" style="flex:1" data-act="confirmCancel">取消</button>
            <button class="btn ${danger ? 'danger' : 'primary'}" style="flex:1" data-act="confirmOk">确定</button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.style.overflow = 'hidden';
  window.__confirmCb = onConfirm;
}
function confirmOk() { const cb = window.__confirmCb; window.__confirmCb = null; closeModal(); if (cb) cb(); }
function confirmCancel() { window.__confirmCb = null; closeModal(); }

/* 轻提示 */
let toastTimer;
function toast(msg, ms) {
  const t = $('#toast-root');
  if (!t) return;
  clearTimeout(toastTimer);
  t.innerHTML = `${esc(String(msg))} <span style="margin-left:8px;cursor:pointer;opacity:.6" data-act="closeToast">✕</span>`;
  t.classList.add('show');
  toastTimer = setTimeout(() => t.classList.remove('show'), ms || 2600);
}
/* 带撤销的 toast（msg 为纯文本，内部自动 esc 转义） */
function toastUndo(msg, undoFn) {
  const t = $('#toast-root');
  if (!t) return;
  clearTimeout(toastTimer);
  t.innerHTML = `${esc(String(msg))} <span style="color:#c9a86a;font-weight:700;margin-left:8px;cursor:pointer" data-act="toastUndo">撤销</span> <span style="margin-left:6px;cursor:pointer;opacity:.6" data-act="closeToast">✕</span>`;
  t.classList.add('show');
  window.__undoFn = undoFn;
  toastTimer = setTimeout(() => { t.classList.remove('show'); window.__undoFn = null; }, 5000);
}
function closeToast() { clearTimeout(toastTimer); const t = $('#toast-root'); if (t) t.classList.remove('show'); }
/* 搜索高亮：在文本中标记匹配关键词 */
function highlightKw(text, kw) {
  /* 必须在「未转义」的原文上定位，再逐段转义。
     旧实现先 esc() 再查找：会在 &amp; 等 HTML 实体内部误匹配（例如搜 "amp" 命中 &amp;），
     并且按转义后的长度去切片，会把实体截成 &<mark>amp</mark>; 导致显示错乱。 */
  const raw = String(text == null ? '' : text);
  if (!kw) return esc(raw);
  const lower = raw.toLowerCase(), k = String(kw).toLowerCase();
  if (!k) return esc(raw);
  const mark = '<mark style="background:rgba(201,168,106,.35);color:inherit;border-radius:2px;padding:0 1px">';
  const parts = lower.split(k);
  if (parts.length <= 1) return esc(raw);
  let result = '', pos = 0;
  for (let i = 0; i < parts.length; i++) {
    result += esc(raw.slice(pos, pos + parts[i].length));
    pos += parts[i].length;
    if (i < parts.length - 1) {
      result += mark + esc(raw.slice(pos, pos + k.length)) + '</mark>';
      pos += k.length;
    }
  }
  return result;
}

/* ---------------- 6. 图表（ECharts 雷达图） ---------------- */
function disposeCharts() { chartInstances.forEach(c => c.dispose()); chartInstances = []; }
function makeChart(id, option, onClick) {
  const el = document.getElementById(id);
  if (!el) return;
  if (typeof echarts === 'undefined') {
    // ECharts 加载失败：降级为纯文本展示
    const radars = (option && option.radar && option.radar.indicator) || [];
    const vals = (option && option.series && option.series[0] && option.series[0].data && option.series[0].data[0] && option.series[0].data[0].value) || [];
    el.innerHTML = `<div style="padding:12px 6px;font-size:12px;color:var(--dim);line-height:2">
      ${radars.map((r, i) => `<div style="display:flex;justify-content:space-between;gap:8px">
        <span>${r.name}</span><span style="color:var(--amber);font-weight:600">${Math.round(vals[i] || 0)} / 100</span></div>`).join('')}
      <div style="margin-top:8px;font-size:11px;opacity:.6">图表库离线，如需完整雷达图请联网后刷新</div>
    </div>`;
    el.style.display = 'block';
    return;
  }
  disposeChart(id);
  const c = echarts.init(el);
  c.setOption(option);
  if (onClick) c.on('click', onClick);
  chartInstances.push(c);
}
function disposeChart(id) {
  const idx = chartInstances.findIndex(c => c.getDom() && c.getDom().id === id);
  if (idx >= 0) { chartInstances[idx].dispose(); chartInstances.splice(idx, 1); }
}
function radarOption(ind, vals) {
  return {
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: '#fffdf7',
      borderColor: 'rgba(185,164,128,.35)',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: '#4a4238', fontSize: 12 },
      formatter: function(p) {
        if (!p || !p.value) return '';
        return ind.map((d, i) => d + '：' + Math.round(p.value[i]) + ' / 100').join('<br>');
      }
    },
    radar: {
      indicator: ind.map(i => ({ name: i, max: 100 })),
      radius: '66%', center: ['50%', '54%'],
      shape: 'polygon', splitNumber: 4,
      axisName: { color: '#7d7263', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(185,164,128,.3)' } },
      splitArea: { areaStyle: { color: ['rgba(127,174,131,.05)', 'rgba(127,174,131,.11)'] } },
      axisLine: { lineStyle: { color: 'rgba(185,164,128,.35)' } }
    },
    series: [{
      type: 'radar',
      data: [{
        value: vals, name: '当前',
        areaStyle: { color: 'rgba(95,133,117,.16)' },
        lineStyle: { color: '#5f8575', width: 2, shadowColor: 'rgba(95,133,117,.35)', shadowBlur: 10 },
        itemStyle: { color: '#5f8575' },
        symbol: 'circle', symbolSize: 4
      }]
    }]
  };
}
window.addEventListener('resize', () => chartInstances.forEach(c => c.resize()));

/* ---------------- 7. 视图渲染 ---------------- */
function render() {
  disposeCharts();
  const v = $('#view');
  switch (state.tab) {
    case 'radar': v.innerHTML = viewRadar(); break;
    case 'persons': v.innerHTML = viewPersons(); break;
    case 'record': v.innerHTML = viewRecord(); break;
    case 'train': v.innerHTML = viewTrain(); break;
    case 'me': v.innerHTML = viewMe(); break;
  }
  renderTop();
  $$('#tabbar .tab').forEach(t => t.classList.toggle('active', t.dataset.arg === state.tab));
  afterRender();
}
function renderTop() {
  const m = overallMetrics();
  const num = $('#idxNum'), arc = $('#idxArc');
  if (!m) { num.textContent = '--'; if (arc) arc.setAttribute('stroke-dashoffset', '113.1'); return; }
  num.textContent = m.index;
  const off = 113.1 * (1 - m.index / 100);
  if (arc) arc.setAttribute('stroke-dashoffset', off);
}
function afterRender() {
  /* 各视图图表在 html 注入后由本钩子创建 */
  if (state.tab === 'radar') {
    const m = overallMetrics();
    if (m) makeChart('homeChart', radarOption(['人脉规模', '人情热度', '往来频率', '人情信用', '处世智慧'],
      [m.scale, Math.round(m.heatAvg), m.freq, Math.round(m.credit), m.wisdom]), onHomeChartClick);
  }
  if (state.tab === 'me' && document.getElementById('trendChart')) {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ label: (d.getMonth() + 1) + '月', c: state.events.filter(e => fmtDate(e.time).startsWith(ym)).length });
    }
    makeChart('trendChart', {
      backgroundColor: 'transparent',
      grid: { left: 8, right: 8, top: 22, bottom: 4, containLabel: true },
      xAxis: { type: 'category', data: months.map(x => x.label), axisLine: { lineStyle: { color: 'rgba(185,164,128,.4)' } }, axisLabel: { color: '#7d7263', fontSize: 10 }, axisTick: { show: false } },
      yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: 'rgba(185,164,128,.18)' } }, axisLabel: { color: '#a89b88', fontSize: 10 } },
      series: [{
        type: 'bar', data: months.map(x => x.c), barWidth: '52%',
        itemStyle: { color: '#7da08f', borderRadius: [6, 6, 0, 0] },
        label: { show: true, position: 'top', color: '#7d7263', fontSize: 10 }
      }],
      tooltip: { trigger: 'axis', backgroundColor: '#fffdf7', borderColor: 'rgba(185,164,128,.35)', borderWidth: 1, textStyle: { color: '#4a4238', fontSize: 12 }, formatter: (ps) => ps[0].axisValue + '：' + ps[0].value + ' 笔往来' }
    });
  }
  if (state.tab === 'me' && document.getElementById('network-canvas')) {
    drawNetwork(document.getElementById('network-canvas'));
  }
  if (state.tab === 'me' && document.getElementById('typeChart')) {
    const nowT = new Date();
    const yStartT = `${nowT.getFullYear() - 1}-${String(nowT.getMonth() + 1).padStart(2, '0')}-01`;
    const tCnt = {};
    for (const e of state.events) if (fmtDate(e.time) >= yStartT) tCnt[e.type] = (tCnt[e.type] || 0) + 1;
    const data = Object.entries(tCnt).map(([k, v]) => ({ name: (EVENT_TYPES[k] || EVENT_TYPES.other).label, value: v }));
    if (data.length) {
      makeChart('typeChart', {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item', backgroundColor: '#fffdf7', borderColor: 'rgba(185,164,128,.35)', borderWidth: 1, textStyle: { color: '#4a4238', fontSize: 12 }, formatter: '{b}：{c} 笔（{d}%）' },
        legend: { bottom: 0, textStyle: { color: '#7d7263', fontSize: 10 }, itemWidth: 10, itemHeight: 10, itemGap: 10 },
        series: [{ type: 'pie', radius: ['46%', '66%'], center: ['50%', '42%'], itemStyle: { borderColor: '#fffdf7', borderWidth: 2 }, label: { show: false }, data }],
        color: ['#5f8575', '#7da08f', '#9cbfa8', '#c9a86a', '#8aa6c9', '#c97b7b', '#a8c0da', '#b9a484', '#7fae83', '#d3c4a8']
      });
    }
  }
}
/* 点雷达图：按点击角度就近匹配五维，打开解读 */
function onHomeChartClick(params) {
  if (!params || params.componentType !== 'series' || params.seriesType !== 'radar') return;
  const ev = params.event;
  if (!ev || ev.offsetX == null) return;
  const c = this;
  const center = c.convertToPixel({ seriesIndex: 0 }, [0, 0]);
  if (!center) return;
  let ang = Math.atan2(ev.offsetY - center[1], ev.offsetX - center[0]);
  const names = ['人脉规模', '人情热度', '往来频率', '人情信用', '处世智慧'];
  let best = 0, bestD = 1e9;
  for (let i = 0; i < 5; i++) {
    const a = (-90 + 72 * i) * Math.PI / 180;
    let d = Math.abs(ang - a); d = Math.min(d, 2 * Math.PI - d);
    if (d < bestD) { bestD = d; best = i; }
  }
  openDimInsight(names[best]);
}
/* 维度解读 */
function openDimInsight(dim) {
  const m = overallMetrics();
  /* 预建「人脉 → 最后往来时间」映射：原本 lastTsOf 在排序比较器里对每个人做一次
     全量 events.filter，复杂度 O(人×log人×事件)，人多时会明显卡顿。改为一次遍历 O(事件)。 */
  const lastTsMap = {};
  for (const ev of state.events) {
    if (!lastTsMap[ev.personId] || ev.time > lastTsMap[ev.personId]) lastTsMap[ev.personId] = ev.time;
  }
  const lastTsOf = (id) => lastTsMap[id] || 0;
  const chips = (arr) => arr.slice(0, 3).map(p => `<span class="chip">${esc(p.name)}</span>`).join(' ') || '<span class="chip">暂无</span>';
  const byHeat = state.persons.slice().sort((a, b) => computedFor(b.id).heat - computedFor(a.id).heat);
  const byLast = state.persons.slice().sort((a, b) => lastTsOf(b.id) - lastTsOf(a.id));
  const byDebt = state.persons.slice().sort((a, b) => computedFor(b.id).debt - computedFor(a.id).debt).filter(p => computedFor(p.id).debt > 0);
  const INS = {
    '人脉规模': { v: m.scale, d: '你的人脉池有多大：记进来的人数越多、覆盖的身份越广，规模分越高。', t: '保持「每月认识一两个新朋友」的节奏，多参加聚会和介绍局；老关系也别丢，质量比数量重要。', p: '热度最高的人脉', lst: byHeat },
    '人情热度': { v: Math.round(m.heatAvg), d: '整体关系的平均温度：来自每一笔往来的加权热度，90 天不走动会慢慢降温。', t: '热度是「动」出来的：问候、饭局、帮个小忙，都比节日群发一句有效。', p: '热度最高的人脉', lst: byHeat },
    '往来频率': { v: m.freq, d: '近期活跃度：近 30 天的往来越密，分数越高；长期不联系会掉分。', t: '把「好久没联系」的人排个序，从最久没走动的开始，一句问候破冰。', p: '最近有往来的人脉', lst: byLast },
    '人情信用': { v: Math.round(m.credit), d: '人情账的平衡：欠的人情还上、收的礼回过去，信用分才涨。', t: '人情债要趁热还：请顿饭、回个礼、主动帮一次忙。只进不出，圈子会越走越窄。', p: '欠人情较多的人脉', lst: byDebt },
    '处世智慧': { v: m.wisdom, d: '你的情景应对能力：来自修炼场的答题得分，难度越高智慧值加成越大。', t: '去「修炼场」练题：入门 ×1、进阶 ×1.25、高手 ×1.5，练过的题会记住最高分。', p: '去修炼场提升', lst: [] }
  };
  const it = INS[dim] || INS['人情热度'];
  openSheet(`${dim} · ${it.v} / 100`, `
    <div class="card" style="margin:0 0 12px;padding:12px 14px">
      <div class="sub" style="margin-bottom:4px">这是什么</div>
      <div style="font-size:14px;line-height:1.7">${it.d}</div>
    </div>
    <div class="card" style="margin:0 0 12px;padding:12px 14px">
      <div class="sub" style="margin-bottom:4px">怎么提升</div>
      <div style="font-size:14px;line-height:1.7">${it.t}</div>
    </div>
    <div class="card" style="margin:0;padding:12px 14px">
      <div class="sub" style="margin-bottom:6px">${it.p}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${chips(it.lst)}</div>
    </div>
  `, true);
}
function openIndexInfo() {
  openSheet('人情指数怎么算', `
    <div class="card" style="margin:0 0 12px;padding:12px 14px">
      <div class="sub" style="margin-bottom:4px">构成（加权平均）</div>
      <div style="font-size:14px;line-height:2">
        人脉规模 ×20%<br>人情热度 ×25%<br>往来频率 ×20%<br>人情信用 ×20%<br>处世智慧 ×15%
      </div>
    </div>
    <div class="card" style="margin:0;padding:12px 14px">
      <div class="sub" style="margin-bottom:4px">怎么提升</div>
      <div style="font-size:14px;line-height:1.7">热度权重最高：多记录真实往来、保持走动，指数涨得最快；欠人情会拖累信用分；练情景题能补智慧值。</div>
    </div>
  `, true);
}

/* ---------- 首页：雷达 ---------- */
function viewRadar() {
  const m = overallMetrics();
  if (!m) {
    return `<div class="empty" style="padding-top:70px">
      <div style="text-align:center;margin-bottom:14px">${LOGO_SVG.replace('viewBox="0 0 32 32"', 'viewBox="0 0 32 32" style="width:72px;height:72px"')}</div>
      <div class="t">人脉雷达还没启动</div>
      <div class="d">${BRAND.slogan}。记录你的人脉和人情往来，雷达会自动生成每个人的关系画像，并提醒你该走动、该还人情。</div>
      <button class="btn primary" data-act="demo">载入演示数据，先看看效果</button>
      <button class="btn" data-act="go" data-arg="persons" style="margin-left:8px">去添加人脉</button>
    </div>`;
  }
  const alerts = buildAlerts();
  const dims = [
    { n: '人脉规模', v: m.scale }, { n: '人情热度', v: Math.round(m.heatAvg) },
    { n: '往来频率', v: m.freq }, { n: '人情信用', v: Math.round(m.credit) }, { n: '处世智慧', v: m.wisdom }
  ];
  let alertHtml = '';
  const icMap = {
    debt: ['#c9a86a', '<path d="M12 3l8 5v8l-8 5-8-5V8z"/><path d="M12 8v5m0 3h.01"/>'],
    stale: ['#c97b7b', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
    bday: ['#5f8575', '<path d="M4 9h16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M8 9V5m8 4V5"/><path d="M6 15v4m12-4v4"/>'],
    todo: ['#8aa6c9', '<path d="M4 6h16v12H4z"/><path d="M8 4v4m8-4v4"/><path d="M8 12l3 3 5-5"/>'],
    fest: ['#8aa6c9', '<path d="M12 3l8 5v8l-8 5-8-5V8z"/><path d="M12 8v5m0 3h.01"/><path d="M12 3v2m8 3l-1.7 1.2M12 21v-2M4 8l1.7 1.2"/>'],
    red: ['#c97b7b', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
    amber: ['#c9a86a', '<path d="M12 3l8 5v8l-8 5-8-5V8z"/><path d="M12 8v5m0 3h.01"/>'],
    teal: ['#5f8575', '<path d="M4 9h16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M8 9V5m8 4V5"/><path d="M6 15v4m12-4v4"/>'],
    blue: ['#8aa6c9', '<circle cx="12" cy="12" r="9"/>']
  };
  if (alerts.length) {
    alertHtml = `<div class="card"><h3><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c9a86a" stroke-width="2" stroke-linecap="round"><path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 8v5m0 3h.01"/></svg>今日提醒（${alerts.length}）</h3>
      <div style="margin-top:6px">${alerts.map(a => {
        const [col, ic] = icMap[a.cls] || icMap.blue;
        const act = a.personId && !a.reminderId ? ` data-act="openPerson" data-arg="${a.personId}"` : (a.personId ? '' : ' data-act="festTip"');
        return `<div class="alertitem"${act}>
          <div class="ic" style="background:${col}22;color:${col}"><svg viewBox="0 0 24 24">${ic}</svg></div>
          <div class="tx" style="flex:1">${a.text}</div>${a.personId && !a.reminderId ? `<button class="btn sm ghost" data-act="eventQuick" data-arg="${a.personId}" style="flex-shrink:0">记一笔</button>` : ''}${a.reminderId ? `<button class="btn sm ghost" data-act="quickDone" data-arg="${a.reminderId}">完成</button>` : ''}</div>`;
      }).join('')}</div></div>`;
  } else {
    alertHtml = `<div class="card"><h3>今日提醒</h3><div class="sub" style="margin-top:6px">一切安好，没有需要操心的往来。人情是细水长流，保持节奏就好。</div></div>`;
  }
  return `
    <div class="radar-stage">
      <div class="radar-grid"><span class="cx"></span><span class="cy"></span></div>
      <div class="card" style="text-align:center;padding-top:8px">
        <h3 style="justify-content:center">人脉总览雷达</h3>
        <div id="homeChart" class="chart"></div>
        <div class="sub">五维综合画像 · 点雷达或下方维度条，看每个维度的解读</div>
      </div>
    </div>
    <div class="card" style="padding:12px 14px">
      <div class="dimrow" style="margin-bottom:6px"><span class="nm">人情指数</span><span class="v" style="width:auto;color:var(--teal);font-size:15px">${m.index}<span style="color:var(--dim);font-size:11px"> / 100</span></span><span class="chip" data-act="indexInfo" style="margin-left:auto">怎么算的</span></div>
      ${dims.map(d => `<div class="dimrow" data-act="dimInsight" data-arg="${d.n}" style="cursor:pointer">
        <span class="nm">${d.n}</span>
        <div class="track"><div class="fill" style="width:${d.v}%;background:linear-gradient(90deg,var(--teal2),var(--teal))"></div></div>
        <span class="v">${d.v}</span>
        <span style="color:var(--dim);font-size:13px">›</span></div>`).join('')}
    </div>
    ${alertHtml}
    <div class="card" style="display:flex;gap:10px">
      <button class="btn primary" style="flex:1" data-act="go" data-arg="record">快速记录一笔往来</button>
      <button class="btn" style="flex:1" data-act="go" data-arg="train">去修炼场练手</button>
    </div>`;
}

/* ---------- 人脉列表 ---------- */
function viewPersons() {
  const kw = state.filter.trim().toLowerCase();
  let list = state.persons.slice();
  if (state.sortBy === 'last') {
    list.sort((a, b) => {
      const la = state.events.filter(e => e.personId === a.id).reduce((mx, e) => Math.max(mx, e.time), 0);
      const lb = state.events.filter(e => e.personId === b.id).reduce((mx, e) => Math.max(mx, e.time), 0);
      return lb - la;
    });
  } else if (state.sortBy === 'debt') {
    list.sort((a, b) => computedFor(b.id).debt - computedFor(a.id).debt);
  } else {
    list.sort((a, b) => computedFor(b.id).heat - computedFor(a.id).heat);
  }
  if (state.identity !== 'all') list = list.filter(p => p.identity === state.identity);
  if (kw) list = list.filter(p => (p.name + ' ' + (p.identity || '') + ' ' + (p.tags || []).join(' ') + ' ' + (p.note || '')).toLowerCase().includes(kw));
  const chips = ['全部', ...IDENTITIES].map(id =>
    `<button class="fchip ${state.identity === id ? 'on' : ''}" data-act="filterId" data-arg="${id}">${id}</button>`).join('');
  const sortChips = [['heat', '热度'], ['last', '最近往来'], ['debt', '人情债']].map(([k, lab]) =>
    `<button class="fchip ${state.sortBy === k ? 'on' : ''}" data-act="sortBy" data-arg="${k}">${lab}</button>`).join('');
  const totalBefore = state.persons.filter(p => state.identity === 'all' || p.identity === state.identity).length;
  const cards = list.map(p => {
    const m = computedFor(p.id);
    const tags = (p.tags || []).slice(0, 2).map(t => `<span class="chip">${highlightKw(t, kw)}</span>`).join('');
    const flags = [];
    if (m.debt >= 10) flags.push(`<span class="chip amber">欠人情 ${Math.round(m.debt)}</span>`);
    if (m.lastDays !== null && m.lastDays >= 60) flags.push(`<span class="chip red">${m.lastDays}天没往来</span>`);
    return `<div class="personcard" data-act="openPerson" data-arg="${p.id}">
      <div class="avatar">${esc(initials(p.name))}</div>
      <div class="pc-main">
        <div class="pc-name">${highlightKw(p.name, kw)} <span class="chip teal">${highlightKw(p.identity || '朋友', kw)}</span></div>
        <div class="pc-meta">${tags}${flags}</div>
        <div class="heatbar"><span style="font-size:11px;color:var(--dim)">热度</span>
          <div class="track"><div class="fill" style="width:${m.heat}%"></div></div>
          <span class="val">${Math.round(m.heat)}</span></div>
      </div>
      <div class="pc-right">${m.lastDays === null ? '尚无往来' : timeAgo(state.events.filter(e => e.personId === p.id).reduce((mx, e) => Math.max(mx, e.time), 0))}<br>${m.eventCount} 笔记录</div>
    </div>`;
  }).join('');
  const matchInfo = kw ? `<div style="padding:0 14px 6px;font-size:12px;color:var(--dim)">匹配 ${list.length} / ${totalBefore} 人</div>` : '';
  return `
    <div class="sec-t"><h2>人脉</h2>
      <button class="btn primary sm" data-act="personForm">＋ 添加</button></div>
    <div style="padding:0 14px 10px"><input class="inp" id="fSearch" placeholder="搜索姓名 / 标签 / 备注…" value="${esc(state.filter)}" data-change="search"></div>
    ${matchInfo}
    <div class="fchips">${chips}</div>
    <div class="fchips" style="padding-top:0"><span style="font-size:12px;color:var(--dim);padding:6px 4px">排序</span>${sortChips}</div>
    ${cards || (state.persons.length
      ? `<div class="empty"><div class="t">没有找到相关人脉</div><div class="d">换个关键词试试，或直接添加一位新的人脉。</div>
        <button class="btn primary" data-act="personForm">＋ 添加新朋友</button></div>`
      : `<div class="empty"><div class="t">还没有人脉</div><div class="d">把生命中重要的人记进来，雷达会自动生成为你经营人情的清单。</div>
        <button class="btn primary" data-act="personForm">添加第一个人</button></div>`)}`;
}

/* ---------- 快速记录 ---------- */
function viewRecord() {
  const persons = state.persons;
  const opts = persons.map(p => `<option value="${p.id}" ${state.evPersonId === p.id ? 'selected' : ''}>${esc(p.name)} · ${esc(p.identity || '')}</option>`).join('');
  const recent = state.events.slice().sort((a, b) => b.time - a.time).slice(0, 8);
  const evRows = recent.map((e, i) => {
    const p = state.persons.find(x => x.id === e.personId);
    const t = EVENT_TYPES[e.type] || EVENT_TYPES.other;
    const canUndo = i === 0 && e.id === state.lastEventId;
    return `<div class="tlitem ${e.weight < 0 ? 'neg' : ''}">
      <div class="th">${esc(p ? p.name : '未知')}<span class="chip">${t.label}</span><span class="w ${e.weight < 0 ? 'neg' : ''}">${e.weight > 0 ? '+' : ''}${e.weight}</span><button class="delbtn" data-act="delEvent" data-arg="${e.id}">删</button></div>
      <div class="tm">${esc(e.title)} · ${timeAgo(e.time)}${canUndo ? `<span style="margin-left:8px;color:var(--amber)" data-act="undoLast">↺ 撤销</span>` : ''}</div>
    </div>`;
  }).join('');
  const typeChips = Object.keys(EVENT_TYPES).map(k => {
    const t = EVENT_TYPES[k];
    return `<button class="typecell ${state.evType === k ? 'on' : ''}" data-act="typeSel" data-arg="${k}">
      <svg viewBox="0 0 24 24">${typeIcon(k)}</svg>${t.label}</button>`;
  }).join('');
  return `
    <div class="sec-t"><h2>快速记录</h2><span class="sub" style="font-size:12px">饭局散场前，10 秒记一笔</span></div>
    <div class="card">
      <div class="field"><label>关联人</label>
        <div style="display:flex;gap:8px">
          <select class="inp" id="fPerson" data-change="evPerson" style="flex:1">
            <option value="">— 选择人脉 —</option>${opts}
          </select>
          <button class="btn sm" data-act="personForm" style="flex:none">＋新朋友</button>
        </div>
      </div>
      <div class="field"><label>事件类型</label><div class="typegrid">${typeChips}</div></div>
      <div class="field"><label>一句话（按类型自动带默认分值，可调）</label>
        <input class="inp" id="fTitle" placeholder="${EVENT_TYPES[state.evType].label}，例如：周五晚上一起吃了顿火锅" value="">
      </div>
      <div style="display:flex;gap:10px">
        <div class="field" style="flex:1"><label>发生时间</label><input class="inp" id="fTime" type="date" value="${todayStr()}" max="${todayStr()}"></div>
        <div class="field"><label>人情值</label>
          <div class="stepper"><button data-act="wstep" data-arg="-1">−</button><span id="fWeight">${EVENT_TYPES[state.evType].dHeat}</span><button data-act="wstep" data-arg="1">＋</button></div>
        </div>
      </div>
      <div class="field"><label>备注（可选）</label><textarea class="inp" id="fNote" placeholder="补充细节，比如谁介绍的、聊了什么…"></textarea></div>
      <button class="btn primary block" data-act="eventSubmit" ${persons.length ? '' : 'disabled'}>保存这笔往来</button>
      ${persons.length ? '' : '<div class="sub" style="margin-top:8px;text-align:center">还没有人脉，先添加一位再记录。</div>'}
    </div>
    <div class="card">
      <h3>最近往来 <span style="margin-left:auto;font-weight:400;font-size:12px;color:var(--sub)">${state.events.length} 笔</span></h3>
      <div class="tl" style="margin-top:10px">${evRows || '<div class="sub">还没有记录，从上面记第一笔开始。</div>'}</div>
      ${state.events.length > 8 ? '<button class="btn sm" style="margin-top:10px" data-act="allEvents">查看全部往来</button>' : ''}
    </div>`;
}
function typeIcon(k) {
  return {
    help_them: '<path d="M4 12l5-5v3h8v4H9v3z"/><path d="M17 8l3 4-3 4"/>',
    help_me: '<path d="M20 12l-5 5v-3H7V8h8V5z"/>',
    meal: '<path d="M5 4c0 4 2 6 2 8s-2 4-2 8h6c0-4-2-6-2-8s2-4 2-8"/><path d="M17 4v16"/>',
    gift_get: '<path d="M4 9h16v11H4z"/><path d="M12 9v11"/><path d="M8 6a2 2 0 1 1 4 0c0 2-4 3-4 3m8-3a2 2 0 1 0-4 0c0 2 4 3 4 3"/>',
    gift_give: '<path d="M20 9H4v11h16z"/><path d="M12 9v11"/><path d="M8 6a2 2 0 1 1 4 0c0 2-4 3-4 3m8-3a2 2 0 1 0-4 0c0 2 4 3 4 3"/>',
    money: '<circle cx="12" cy="12" r="8.5"/><path d="M9 9.5c.5-1 1.8-1.6 3.2-1.6 2 0 3.3 1 3.3 2.4 0 3.4-6.5 1.6-6.5 4.8 0 1.4 1.3 2.4 3.3 2.4 1.4 0 2.7-.6 3.2-1.6"/><path d="M12 6.5v11"/>',
    talk: '<path d="M4 6h16v11H9l-5 4z"/><path d="M8 10h8m-8 3h5"/>',
    greeting: '<path d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z"/><path d="M8 9h.01M12 9h.01M16 9h.01"/><path d="M8.5 13.5c1 1.4 2 2 3.5 2s2.5-.6 3.5-2"/>',
    conflict: '<path d="M8 8l8 8m0-8l-8 8"/><circle cx="12" cy="12" r="9"/>',
    other: '<circle cx="12" cy="12" r="2.5"/><path d="M12 5v4.5M12 14.5V19M5 12h4.5M14.5 12H19"/>'
  }[k] || '<circle cx="12" cy="12" r="9"/>';
}

/* ---------- 修炼场 ---------- */
function viewTrain() {
  const w = getWisdom(), lv = getLevel(w);
  const sk = state.streak || { n: 0, last: '' };
  const trainedToday = sk.last === todayStr();
  const todayIdx = Math.floor(Date.now() / DAY) % SCENARIOS.length;
  const today = SCENARIOS[todayIdx];
  const diffChips = ['全部', '入门', '进阶', '高手'].map(d =>
    `<button class="fchip ${state.trainDiff === d ? 'on' : ''}" data-act="trainDiff" data-arg="${d}">${d === '全部' ? '全部难度' : d + '题'}</button>`).join('');
  const others = SCENARIOS.filter((_, i) => i !== todayIdx)
    .filter(s => state.trainDiff === '全部' || s.diff === state.trainDiff);
  const list = others.map(s => {
    const pr = state.progress[s.id];
    const dc = DIFFS[s.diff];
    return `<div class="scen-card" data-act="scenario" data-arg="${s.id}">
      <span class="tag">${s.tag}</span> <span class="chip ${dc.chip}">${s.diff}</span>
      <h4>${s.title}</h4>
      <div class="sc">${s.scene}</div>
      <div class="foot"><span>${pr ? `已完成 · 最高 ${esc(pr.best)} 分` : '未挑战'}</span><span style="color:var(--teal)">开始 →</span></div>
    </div>`;
  }).join('');
  const td = DIFFS[today.diff];
  return `
    <div class="sec-t"><h2>人情修炼场</h2></div>
    <div class="card level-banner">
      <div class="level-badge">${lv.cur.name}<span class="lv">${w} 智慧值</span></div>
      <div style="flex:1">
        <div style="font-size:14px;font-weight:600">${lv.cur.desc}</div>
        <div class="sub" style="margin-top:2px">已连续修炼 ${sk.n} 天${trainedToday ? ' · 今日已练' : ' · 今日未练'}</div>
        ${lv.nxt ? `<div class="sub">距「${lv.nxt.name}」还差 ${lv.nxt.min - w} 分</div>
          <div class="pbar"><div class="fill" style="width:${lv.pct}%"></div></div>` : '<div class="sub">已达最高段位，世事洞明</div>'}
      </div>
    </div>
    <div class="card" style="border-color:rgba(127,174,131,.45)">
      <h3><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c9a86a" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-3.4 3.6-5 8-5s7.2 1.6 8 5"/></svg>今日情景 · ${today.tag} <span class="chip ${td.chip}" style="margin-left:auto">${today.diff} ×${td.w}</span></h3>
      <h4 style="font-size:15px;margin:8px 0 4px">${today.title}</h4>
      <div class="sub">${today.scene}</div>
      <button class="btn primary block" style="margin-top:12px" data-act="scenario" data-arg="${today.id}">开始应对 →</button>
    </div>
    <div class="sec-t" style="padding-bottom:6px"><h2>情景库</h2><span class="sub">每题满分 100，取最高分 · 难度越高智慧值加成越大</span></div>
    <div class="fchips">${diffChips}</div>
    ${list || '<div class="empty" style="padding:28px 20px"><div class="d">该难度下暂无情景</div></div>'}`;
}

/* 月度洞察：本月往来统计 */
function monthInsights() {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const mev = state.events.filter(e => fmtDate(e.time).startsWith(ym));
  const byPerson = {};
  for (const e of mev) byPerson[e.personId] = (byPerson[e.personId] || 0) + 1;
  const top = Object.entries(byPerson).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([id, n]) => { const p = state.persons.find(x => x.id === id); return p ? `${esc(p.name)} ${n} 笔` : ''; })
    .filter(Boolean).join('、') || '暂无';
  const debts = state.persons.map(p => ({ p, m: computedFor(p.id) }))
    .filter(x => x.m.debt > 0).sort((a, b) => b.m.debt - a.m.debt).slice(0, 3)
    .map(x => `${esc(x.p.name)} ${Math.round(x.m.debt)}`).join('、') || '暂无欠债';
  const np = state.persons.filter(p => fmtDate(p.createdAt || 0).startsWith(ym)).length;
  return { count: mev.length, top, debts, np, ym };
}

/* 年度人情报告：最近 12 个月滚动回顾 */
function openAnnualReport() {
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ label: `${d.getMonth() + 1}月`, c: state.events.filter(e => fmtDate(e.time).startsWith(ym)).length });
  }
  const total = months.reduce((s, x) => s + x.c, 0);
  const yStart = `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const byPerson = {};
  for (const e of state.events) if (fmtDate(e.time) >= yStart) byPerson[e.personId] = (byPerson[e.personId] || 0) + 1;
  const topP = Object.entries(byPerson).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([id, n]) => { const p = state.persons.find(x => x.id === id); return p ? `<span class="chip">${esc(p.name)} ${n} 笔</span>` : ''; })
    .filter(Boolean).join('') || '<span class="chip">暂无</span>';
  const debts = state.persons.map(p => ({ p, m: computedFor(p.id) }))
    .filter(x => x.m.debt > 0).sort((a, b) => b.m.debt - a.m.debt).slice(0, 3)
    .map(x => `${esc(x.p.name)} ${Math.round(x.m.debt)}`).join('、') || '暂无欠债';
  const w = getWisdom(), lv = getLevel(w);
  const peak = Math.max(...months.map(x => x.c), 1);
  const bestM = months.filter(x => x.c === peak).map(x => x.label).join('、');
  let kw = [];
  if (total === 0) kw.push('这一年的往来还是一张白纸，从记录第一笔开始');
  else {
    if (total >= 60) kw.push('走动很勤，是圈子里的人脉活跃分子');
    else if (total >= 20) kw.push('保持了节奏，关系细水长流');
    else kw.push('往来偏少，明年可以多走动');
  }
  if (w >= 60) kw.push('修炼有成，已迈入人情大师');
  else if (w >= 15) kw.push('修炼起步，已略懂世故');
  if (debts !== '暂无欠债') kw.push('人情债榜首是「' + debts.split('、')[0] + '」，记得还');
  const monthBars = months.map(x => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
    <div style="height:${Math.max(4, Math.round(x.c / peak * 64))}px;width:60%;background:linear-gradient(180deg,#7da08f,#5f8575);border-radius:4px 4px 0 0;opacity:${x.c ? 1 : .25}"></div>
    <span style="font-size:9px;color:var(--dim)">${x.label}</span>
    ${x.c ? `<span style="font-size:9px;color:var(--teal);font-weight:700">${x.c}</span>` : ''}
  </div>`).join('');
  openSheet('年度人情报告', `
    <div id="me-report-section">
    <div style="text-align:right;margin-bottom:8px">
      <button class="btn sm" data-act="exportAnnualPng">导出图片</button>
    </div>
    <div class="card" style="margin:0 0 12px;padding:12px 14px;text-align:center">
      <div class="sub">最近 12 个月 · ${months[0].label} — ${months[11].label}</div>
      <div style="font-size:34px;font-weight:700;color:var(--teal);margin:6px 0 2px;font-family:var(--kaiti)">${total}</div>
      <div class="sub">笔人情往来 · 段位「${lv.cur.name}」· 智慧值 ${w}</div>
      ${total === 0 ? '<button class="btn primary block" style="margin-top:12px" data-act="go" data-arg="record">去记录第一笔往来</button>' : ''}
    </div>
    <div class="card" style="margin:0 0 12px;padding:12px 14px">
      <h3>月度节奏</h3>
      <div style="display:flex;align-items:flex-end;gap:2px;margin-top:10px;height:96px">${monthBars}</div>
      <div class="sub" style="margin-top:8px">最勤的一个月是 ${bestM}（${peak} 笔）${peak > 0 ? '，那个月你大概正忙着一圈人的事。' : ''}</div>
    </div>
    <div class="card" style="margin:0 0 12px;padding:12px 14px">
      <h3>这一年，你最常走动的人</h3>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${topP}</div>
      <div class="sub" style="margin-top:8px">人情债前三：${debts}</div>
    </div>
    <div class="card" style="margin:0;padding:12px 14px">
      <h3>年度小结</h3>
      <div style="font-size:14px;line-height:1.8;margin-top:8px">${kw.map(k => '· ' + k).join('<br>')}</div>
    </div>
    <div style="text-align:center;color:var(--dim);font-size:12px;margin-top:16px;font-family:var(--kaiti);letter-spacing:2px">—— ${BRAND.name} · 细水长流 ——</div>
    </div>
  `, true);
}

/* ---------------- 年度报告图片导出（html2canvas） ---------------- */
function exportAnnualPng() {
  const target = document.getElementById('me-report-section');
  if (!target) { toast('请先打开年度报告'); return; }
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => {
    // html2canvas 已随应用内联打包，离线即可导出，无需任何外网请求
    if (typeof html2canvas === 'undefined') {
      toast('请截图分享：双击电源键+音量上');
      return;
    }
    doExport(target);
  }, 300);
  function doExport(el) {
    html2canvas(el, { backgroundColor: '#fffdf7', scale: 2, logging: false, useCORS: true }).then(canvas => {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url; a.download = '人情世故雷达-年报.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      toast('已下载年度报告图片');
    }).catch(() => toast('请截图分享：双击电源键+音量上'));
  }
}

/* ---------------- 关系网络节点图（纯 Canvas） ---------------- */
function drawNetwork(canvas) {
  if (!canvas || !canvas.parentElement) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.parentElement.clientWidth || 320;
  const H = 320;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);
  const persons = state.persons.slice(0, 20);
  if (!persons.length) {
    ctx.fillStyle = '#a89b88'; ctx.font = '13px sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('添加人脉后这里会显示关系网络', W / 2, H / 2);
    return;
  }
  const ID_COLORS = {
    '领导': '#8aa6c9', '同事': '#7da08f', '客户': '#c97b3b',
    '朋友': '#5fbfb3', '家人': '#c97b7b', '长辈': '#a78bbd', '其他': '#a89b88'
  };
  /* 热度映射节点大小 */
  const heats = persons.map(p => Math.round(computedFor(p.id).heat));
  const maxH = Math.max(...heats, 1);
  const cx = W / 2, cy = H / 2, radius = Math.min(W, H) / 2 - 40;
  /* 连线：两人共同事件数 */
  const evByP = {};
  for (const p of persons) evByP[p.id] = state.events.filter(e => e.personId === p.id).length;
  /* 环形布局：第一人在中心，其余均匀分布圆周 */
  const nodes = persons.map((p, i) => {
    if (i === 0) return { x: cx, y: cy, p, heat: heats[0] };
    const ang = (2 * Math.PI * (i - 1)) / (persons.length - 1) - Math.PI / 2;
    return { x: cx + radius * Math.cos(ang), y: cy + radius * Math.sin(ang), p, heat: heats[i] };
  });
  /* 画连线 */
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const shared = Math.min(evByP[a.p.id] || 0, evByP[b.p.id] || 0);
      if (shared > 0) {
        const lw = Math.min(1 + shared * 0.5, 5);
        ctx.strokeStyle = 'rgba(185,164,128,' + Math.min(0.15 + shared * 0.05, 0.5) + ')';
        ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
  }
  /* 画节点 */
  canvas.onclick = function (e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    for (const n of nodes) {
      const r = 8 + (n.heat / maxH) * 14;
      if ((mx - n.x) ** 2 + (my - n.y) ** 2 <= r * r) { openPerson(n.p.id); return; }
    }
  };
  for (const n of nodes) {
    const r = 8 + (n.heat / maxH) * 14;
    const color = ID_COLORS[n.p.identity] || ID_COLORS['其他'];
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = '#fffdf7'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 2 * Math.PI); ctx.stroke();
    ctx.fillStyle = '#4a4238'; ctx.font = '11px sans-serif';
    ctx.fillText(initials(n.p.name), n.x, n.y + r + 10);
  }
}

/* 剪贴板：无后端环境下的数据搬运 */
function backupText() {
  return JSON.stringify({
    app: '人情世故雷达', version: 2, exportedAt: Date.now(),
    persons: state.persons, events: state.events, reminders: state.reminders,
    progress: state.progress, streak: state.streak
  }, null, 1);
}
function openClipboard() {
  openSheet('复制备份到剪贴板', `
    <div class="sub" style="margin-bottom:10px">长按下方内容复制，发给新设备后在「粘贴导入」里粘贴即可恢复（也可存到备忘录）。</div>
    <textarea class="inp" style="min-height:200px;font-size:12px" readonly>${esc(backupText())}</textarea>
  `, true);
}
function openClipboardImport() {
  openSheet('粘贴导入备份', `
    <div class="sub" style="margin-bottom:10px">把之前复制的内容粘贴进来，点导入即可恢复。</div>
    <textarea class="inp" id="cbText" style="min-height:200px;font-size:12px" placeholder="在此粘贴…"></textarea>
    <button class="btn primary block" style="margin-top:12px" data-act="clipboardSubmit">导入</button>
  `, true);
}

/* 全部往来：一次看全所有记录（最近 200 条） */
function openAllEvents() {
  const all = state.events.slice().sort((a, b) => b.time - a.time).slice(0, 200);
  const rows = all.map(e => {
    const p = state.persons.find(x => x.id === e.personId);
    const t = EVENT_TYPES[e.type] || EVENT_TYPES.other;
    return `<div class="tlitem ${e.weight < 0 ? 'neg' : ''}">
      <div class="th">${esc(p ? p.name : '未知')}<span class="chip">${t.label}</span><span class="w ${e.weight < 0 ? 'neg' : ''}">${e.weight > 0 ? '+' : ''}${e.weight}</span><button class="delbtn" data-act="delEvent" data-arg="${e.id}">删</button></div>
      <div class="tm">${esc(e.title)} · ${fmtDate(e.time)} · ${timeAgo(e.time)}${e.note ? ' · ' + esc(e.note) : ''}</div>
    </div>`;
  }).join('');
  openSheet(`全部往来 <span style="font-size:12px;color:var(--sub)">${state.events.length} 笔</span>`, `
    <div class="tl">${rows || '<div class="sub">还没有任何往来记录，去「记录」页记第一笔吧。</div>'}</div>
    ${state.events.length > 200 ? '<div class="sub" style="margin-top:10px">仅展示最近 200 条，删除后热度会重新计算。</div>' : ''}
  `);
}

/* ---------- 我的 ---------- */
/* 成就徽章：全部由当前数据实时推导，不新增持久化字段（避免数据结构迁移风险）。 */
function achievementsList() {
  const nP = state.persons.length;
  const nE = state.events.length;
  const sk = state.streak || { n: 0, last: '' };
  const trained = Object.keys(state.progress || {}).filter(k => ((state.progress[k] || {}).times > 0)).length;
  const withBirthday = state.persons.filter(p => p.birthday).length;
  const m = overallMetrics();
  const idx = m ? m.index : 0;
  let clear = nP > 0;
  for (const p of state.persons) {
    const mm = computedFor(p.id);
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
  return defs.map(x => ({ t: x.t, d: x.d, cur: x.cur, need: x.need, done: x.cur >= x.need }));
}
function achievementsHtml() {
  const list = achievementsList();
  const got = list.filter(x => x.done).length;
  const items = list.map(x => `
    <div style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;background:${x.done ? 'rgba(201,168,106,.14)' : 'rgba(255,255,255,.03)'};border:1px solid ${x.done ? 'rgba(201,168,106,.4)' : 'var(--line)'}">
      <div style="font-size:17px;opacity:${x.done ? 1 : .35}">${x.done ? '🏅' : '🔒'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;opacity:${x.done ? 1 : .55}">${esc(x.t)}</div>
        <div class="sub" style="font-size:11px">${esc(x.d)}</div>
      </div>
      <div style="font-size:11px;color:${x.done ? 'var(--teal)' : 'var(--sub)'};font-weight:600;white-space:nowrap">${x.done ? '已达成' : x.cur + '/' + x.need}</div>
    </div>`).join('');
  return `<div class="card">
    <h3>成就徽章 <span style="margin-left:auto;font-weight:400;font-size:12px;color:var(--sub)">${got} / ${list.length} 已达成</span></h3>
    <div class="sub" style="margin:8px 0 12px">用真实往来解锁徽章：记录、走动、修炼、还清人情，都会留下痕迹。</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px">${items}</div>
  </div>`;
}

function viewMe() {
  const m = overallMetrics();
  const w = getWisdom(), lv = getLevel(w);
  const pending = state.reminders.filter(r => r.status === 'pending').length;
  const ins = monthInsights();
  const installCardHtml = installCard();
  const stats = [
    { n: state.persons.length, l: '人脉' }, { n: state.events.length, l: '往来记录' },
    { n: pending, l: '待办' }, { n: w, l: '智慧值' }
  ].map(s => `<div class="stat"><div class="n">${s.n}</div><div class="l">${s.l}</div></div>`).join('');
  const rems = state.reminders.slice().sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  const remRows = rems.map(r => {
    const rp = state.persons.find(x => x.id === r.personId);
    return `<div class="alertitem">
      <div class="ic" style="background:#8aa6c922;color:#8aa6c9"><svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z"/><path d="M8 4v4m8-4v4"/><path d="M8 12l3 3 5-5"/></svg></div>
      <div class="tx" style="flex:1">${esc(r.content)}<div class="tm">${rp ? `<b style="color:var(--teal)">${esc(rp.name)}</b> · ` : ''}${r.date || '不限'} · ${r.status === 'done' ? '已完成' : '待办'}</div></div>
      ${r.status === 'pending' ? `<button class="btn sm ghost" data-act="reminderDone" data-arg="${r.id}">完成</button>` : ''}
      <button class="btn sm ghost danger" data-act="delReminder" data-arg="${r.id}">删</button>
    </div>`;
  }).join('');
  const dims = m ? [
    ['人脉规模', m.scale], ['人情热度', Math.round(m.heatAvg)], ['往来频率', m.freq],
    ['人情信用', Math.round(m.credit)], ['处世智慧', m.wisdom]
  ] : [];
  /* 最值得经营的人：热度 Top3 */
  const top3 = state.persons.map(p => ({ p, h: computedFor(p.id) }))
    .sort((a, b) => b.h.heat - a.h.heat).slice(0, 3);
  const top3Html = top3.map(x => {
    const mh = x.h;
    const last = mh.lastDays === null ? '尚无往来'
      : timeAgo(state.events.filter(e => e.personId === x.p.id).reduce((mx, e) => Math.max(mx, e.time), 0));
    return `<div class="personcard" data-act="openPerson" data-arg="${x.p.id}" style="margin-bottom:8px">
      <div class="avatar">${esc(initials(x.p.name))}</div>
      <div class="pc-main">
        <div class="pc-name">${esc(x.p.name)} <span class="chip teal">${esc(x.p.identity || '朋友')}</span></div>
        <div class="pc-meta">${(x.p.tags || []).slice(0, 2).map(t => `<span class="chip">${esc(t)}</span>`).join('')}<span style="font-size:12px;color:var(--dim)">${last}</span></div>
        <div class="heatbar"><span style="font-size:11px;color:var(--dim)">热度</span>
          <div class="track"><div class="fill" style="width:${mh.heat}%"></div></div>
          <span class="val">${Math.round(mh.heat)}</span></div>
      </div>
    </div>`;
  }).join('');
  /* 往来类型分布（近 12 个月） */
  const nowT = new Date();
  const yStartT = `${nowT.getFullYear() - 1}-${String(nowT.getMonth() + 1).padStart(2, '0')}-01`;
  const tCnt = {};
  for (const e of state.events) if (fmtDate(e.time) >= yStartT) tCnt[e.type] = (tCnt[e.type] || 0) + 1;
  const tTotal = Object.values(tCnt).reduce((s, v) => s + v, 0);
  return `
    <div class="sec-t"><h2>我的</h2></div>
    <div class="card"><div class="statgrid">${stats}</div></div>
    <div class="card">
      <h3>待办提醒 <span style="margin-left:auto;font-weight:400;font-size:12px;color:var(--sub)">${pending} 项待办</span></h3>
      ${remRows || '<div class="sub" style="margin-top:6px">还没有提醒。可以给人脉加个提醒，比如「月底前请老张吃饭还人情」。</div>'}
      <button class="btn sm" style="margin-top:10px" data-act="reminderModal" data-arg="">＋ 添加提醒</button>
    </div>
    <div class="card">
      <h3>本月洞察（${ins.ym}）</h3>
      <div style="display:flex;gap:8px;margin-top:10px">
        <div class="stat" style="flex:1"><div class="n">${ins.count}</div><div class="l">本月往来</div></div>
        <div class="stat" style="flex:1"><div class="n">${ins.np}</div><div class="l">本月新人脉</div></div>
      </div>
      <div class="sub" style="margin-top:12px;line-height:1.8">
        最常走动：<b style="color:var(--teal)">${ins.top}</b><br>
        人情债前三：${ins.debts}<br>
        提醒：本月${ins.count ? '有 ' + ins.count + ' 笔往来，保持节奏' : '还没有往来记录，去「记录」页记一笔吧'}
      </div>
    </div>
    ${top3.length >= 2 ? `<div class="card">
      <h3>最值得经营的人 <span style="margin-left:auto;font-weight:400;font-size:12px;color:var(--sub)">热度 Top 3</span></h3>
      <div class="sub" style="margin-top:4px">热度最高、最该保持走动的人，点卡片看细节。</div>
      <div style="margin-top:10px">${top3Html}</div>
    </div>` : ''}
    <div class="card">
      <h3>近 6 月往来趋势</h3>
      <div class="sub" style="margin-top:4px">每月记了多少笔往来，看看自己的经营节奏。</div>
      <div id="trendChart" class="chart" style="height:170px;margin-top:6px"></div>
    </div>
    <div class="card">
      <h3>往来类型分布</h3>
      <div class="sub" style="margin-top:4px">近 12 个月，饭局、互助、送礼……哪些往来占了多数。</div>
      ${tTotal ? `<div id="typeChart" class="chart" style="height:180px;margin-top:6px"></div>`
        : '<div class="sub" style="margin-top:10px">还没有数据，记录往来后这里会画出你的往来结构。</div>'}
    </div>
    <div class="card">
      <h3>人情画像</h3>
      ${m ? dims.map(d => `<div class="dimrow" style="margin-top:10px"><span class="nm">${d[0]}</span>
        <div class="track"><div class="fill" style="width:${d[1]}%;background:linear-gradient(90deg,var(--teal2),var(--teal))"></div></div>
        <span class="v">${d[1]}</span></div>`).join('')
        : '<div class="sub" style="margin-top:6px">添加人脉并记录往来后，这里会生成你的画像。</div>'}
      <div class="sub" style="margin-top:10px">当前段位：<b style="color:var(--teal)">${lv.cur.name}</b></div>
      <button class="btn sm" style="margin-top:12px" data-act="annualReport">年度人情报告</button>
    </div>
    <div id="relation-network" class="card">
      <h3>关系网络</h3>
      <div class="sub" style="margin-top:4px">点击节点可查看人脉详情</div>
      <canvas id="network-canvas" style="width:100%;display:block;margin-top:10px"></canvas>
    </div>
    ${achievementsHtml()}
    <div class="card">
      <h3>数据管理</h3>
      <div class="sub" style="margin:8px 0 12px">所有数据只保存在本机浏览器，不上传任何服务器。换设备前记得导出备份，或用剪贴板把数据搬到新设备。</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn" data-act="export">导出备份</button>
        <button class="btn" data-act="exportCsv">导出人脉清单(CSV)</button>
        <button class="btn" data-act="import">导入备份</button>
        <button class="btn" data-act="copyBackup">复制备份</button>
        <button class="btn" data-act="pasteImport">粘贴导入</button>
        <button class="btn danger" data-act="reset">清空数据</button>
        <input type="file" id="importFile" accept=".json,application/json" style="display:none" data-change="importFile">
      </div>
    </div>
    ${installCardHtml}
    <div class="card">
      <div class="brandcard">${LOGO_SVG}
        <div class="bn">人情世故雷达</div>
        <div class="bs">${BRAND.slogan}</div>
        <div class="bv">${BRAND.version} · 本地优先 · 数据只存本机<br>${BRAND.en}</div>
      </div>
      <div class="sub" style="text-align:center">
        以「记录往来 → 自动画像 → 智能提醒 → 情景修炼 → 年度报告」为主线，
        帮你把人情账记明白、把关系经营成细水长流。<br><br>
        · 雷达图由开源可视化库 ECharts 绘制，全程无手写 Canvas<br>
        · 数据存储使用浏览器本地存储，隐私安全<br>
        · 情景均为常见中国式社交场景，答案与点评供参考，人情没有唯一解
      </div>
    </div>`;
}

/* ---------------- 8. 弹层 ---------------- */
function openSheet(title, body, center) {
  $('#modal-root').innerHTML = `
    <div class="mask ${center ? 'center' : ''}">
      <div class="sheet ${center ? 'center' : ''}">
        <div class="shead"><h2>${title}</h2><button class="sclose" data-act="closeModal">✕</button></div>
        <div class="sbody">${body}</div>
      </div>
    </div>`;
  document.body.style.overflow = 'hidden';
  disposeCharts();
}
function refreshHomeChart() {
  if (state.tab !== 'radar') return;
  const m = overallMetrics();
  if (m) makeChart('homeChart', radarOption(['人脉规模', '人情热度', '往来频率', '人情信用', '处世智慧'],
    [m.scale, Math.round(m.heatAvg), m.freq, Math.round(m.credit), m.wisdom]), onHomeChartClick);
}
function closeModal() {
  $('#modal-root').innerHTML = '';
  window.__curPerson = null;
  window.__confirmCb = null;
  document.body.style.overflow = '';
  /* 关闭弹层后重建当前页图表（非 radar 页由 render 处理） */
  disposeCharts();
  /* 仅在 radar 页立即恢复图表；其他页在 render 时由 afterRender 重建 */
  if (state.tab === 'radar') refreshHomeChart();
  render();
}

/* ---------- 人物详情 ---------- */
function openPerson(id) {
  const p = state.persons.find(x => x.id === id);
  if (!p) return;
  window.__curPerson = id;
  const m = computedFor(p.id);
  const t = (p.tags || []).map(x => `<span class="chip teal">${esc(x)}</span>`).join(' ');
  const dims = [
    ['热度', m.heat, '近期往来与事件加权的综合温度', true],
    ['亲密度', m.intimacy, '饭局、深聊、送礼等积累的亲疏', false],
    ['信任度', m.trust, '互助、金钱往来建立的信任', false],
    ['活跃度', m.activity, '距离上次往来的时间映射', false],
    ['人情债', m.debt, '对方帮过你 / 送你礼的累积，越高越该还', false]
  ];
  const dimRows = dims.map(d => {
    const color = d[3] ? 'linear-gradient(90deg,#7da08f,#5f8575)' : 'linear-gradient(90deg,#8aa6c9,#a8c0da)';
    const badge = d[0] === '人情债' && d[1] >= 10 ? ' <span class="chip amber">该还了</span>' : '';
    return `<div class="dimrow"><span class="nm">${d[0]}${badge}</span>
      <div class="track"><div class="fill" style="width:${d[1]}%;background:${color}"></div></div>
      <span class="v">${Math.round(d[1])}</span></div>`;
  }).join('');
  const evs = state.events.filter(e => e.personId === id).sort((a, b) => b.time - a.time);
  const tl = evs.map(e => {
    const tt = EVENT_TYPES[e.type] || EVENT_TYPES.other;
    return `<div class="tlitem ${e.weight < 0 ? 'neg' : ''}">
      <div class="th">${esc(e.title) || tt.label}<span class="chip">${tt.label}</span><span class="w ${e.weight < 0 ? 'neg' : ''}">${e.weight > 0 ? '+' : ''}${e.weight}</span><button class="delbtn" data-act="delEvent" data-arg="${e.id}">删</button></div>
      <div class="tm">${fmtDate(e.time)} · ${timeAgo(e.time)}${e.note ? ' · ' + esc(e.note) : ''}</div>
    </div>`;
  }).join('');
  const rms = state.reminders.filter(r => r.personId === id);
  const rmRows = rms.map(r => `<div class="alertitem">
    <div class="ic" style="background:#8aa6c922;color:#8aa6c9"><svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z"/><path d="M8 4v4m8-4v4"/><path d="M8 12l3 3 5-5"/></svg></div>
    <div class="tx" style="flex:1">${esc(r.content)}<div class="tm">${r.date || '不限'} · ${r.status === 'done' ? '已完成' : '待办'}</div></div>
    <button class="btn sm ghost" data-act="toggleReminder" data-arg="${r.id}">${r.status === 'done' ? '恢复' : '完成'}</button>
  </div>`).join('');
  openSheet(`${esc(p.name)} <span style="font-size:12px;color:var(--sub)">${esc(p.identity || '朋友')}</span>`, `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <div class="avatar" style="width:52px;height:52px;font-size:19px">${esc(initials(p.name))}</div>
      <div style="flex:1">
        <div style="font-size:15px;font-weight:700">${esc(p.name)}${p.birthday ? ` <span class="chip">生日 ${esc(p.birthday)}</span>` : ''}</div>
        <div style="margin-top:5px">${t || '<span class="chip">暂无标签</span>'}</div>
        ${p.note ? `<div class="sub" style="margin-top:5px">${esc(p.note)}</div>` : ''}
      </div>
    </div>
    <div style="margin:0 0 12px;padding:10px 12px;background:rgba(127,174,131,.08);border:1px dashed rgba(127,174,131,.35);border-radius:10px;font-size:13px;line-height:1.65;color:var(--text)">${relationRead(p)}</div>
    <div id="personChart" class="chart" style="height:230px"></div>
    <div class="card" style="margin:0 0 12px;padding:12px 14px">
      ${dimRows}
      <div class="sub" style="margin-top:4px">可手动微调「热度」（自动计算仅供参考，人情最终以你为准）：</div>
      <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
        <button class="btn sm" data-act="adjust" data-arg="-5">−5</button>
        <button class="btn sm" data-act="adjust" data-arg="-1">−1</button>
        <button class="btn sm" data-act="adjust" data-arg="1">＋1</button>
        <button class="btn sm" data-act="adjust" data-arg="5">＋5</button>
        <span class="chip" style="margin-left:auto">当前热度 ${Math.round(m.heat)}${p.adjust ? `（含手动 ±${esc(p.adjust)}）` : ''}</span>
      </div>
    </div>
    <div class="card" style="border-color:rgba(127,174,131,.4)">
      <h3>走动建议</h3>
      <div class="sub" style="margin-top:6px">${getSuggestion(p)}</div>
    </div>
    <div class="card">
      <h3>往来时间线 <span style="margin-left:auto;font-weight:400;font-size:12px;color:var(--sub)">${evs.length} 笔</span></h3>
      <div class="tl" style="margin-top:10px">${tl || '<div class="sub">还没有往来记录，点下方按钮记第一笔。</div>'}</div>
      <button class="btn primary block" style="margin-top:10px" data-act="eventModal" data-arg="${id}">记一笔往来</button>
    </div>
    ${rms.length ? `<div class="card"><h3>待办提醒</h3>${rmRows}</div>` : ''}
    <div style="display:flex;gap:8px;margin-top:4px">
      <button class="btn" style="flex:1" data-act="reminderModal" data-arg="${id}">加提醒</button>
      <button class="btn" style="flex:1" data-act="personForm" data-arg="${id}">编辑资料</button>
      <button class="btn danger" style="flex:1" data-act="delPerson" data-arg="${id}">删除</button>
    </div>`, false);
  afterPersonChart(p, m);
}
function afterPersonChart(p, m) {
  makeChart('personChart', radarOption(['热度', '亲密度', '信任度', '活跃度', '人情债'],
    [Math.round(m.heat), Math.round(m.intimacy), Math.round(m.trust), m.activity, Math.round(m.debt)]));
}

/* ---------- 人物表单 ---------- */
function personForm(id) {
  const p = id ? state.persons.find(x => x.id === id) : null;
  openSheet(p ? '编辑人脉' : '添加人脉', `
    <div class="field"><label>姓名</label><input class="inp" id="pfName" value="${esc(p ? p.name : '')}" placeholder="怎么称呼"></div>
    <div class="field"><label>身份</label>
      <select class="inp" id="pfIdentity">${IDENTITIES.map(i => `<option ${p && p.identity === i ? 'selected' : ''}>${i}</option>`).join('')}</select></div>
    <div class="field"><label>标签（逗号分隔）</label><input class="inp" id="pfTags" value="${esc(p ? (p.tags || []).join('，') : '')}" placeholder="如：大学死党，球友"></div>
    <div class="field"><label>生日（用于生日提醒，可选）</label><input class="inp" id="pfBirth" type="date" value="${p && p.birthday ? esc(toDateInput(p.birthday)) : ''}"></div>
    <div class="field"><label>备注</label><textarea class="inp" id="pfNote" placeholder="重要细节、忌讳、最近在忙什么…">${esc(p ? p.note || '' : '')}</textarea></div>
    <button class="btn primary block" data-act="personSubmit" data-arg="${p ? p.id : ''}">保存</button>
  `, true);
}

/* ---------- 事件表单 ---------- */
function eventModal(personId) {
  const opts = state.persons.map(x => `<option value="${x.id}" ${x.id === personId ? 'selected' : ''}>${esc(x.name)} · ${esc(x.identity || '')}</option>`).join('');
  openSheet('记一笔往来', `
    <div class="field"><label>关联人</label><select class="inp" id="efPerson"><option value="">— 选择人脉 —</option>${opts}</select></div>
    <div class="field"><label>事件类型</label><div class="typegrid" id="efTypes">${Object.keys(EVENT_TYPES).map(k =>
      `<button class="typecell" data-act="modalType" data-arg="${k}"><svg viewBox="0 0 24 24">${typeIcon(k)}</svg>${EVENT_TYPES[k].label}</button>`).join('')}</div></div>
    <div class="field"><label>一句话</label><input class="inp" id="efTitle" placeholder="例如：帮我协调了跨部门资源"></div>
    <div style="display:flex;gap:10px">
      <div class="field" style="flex:1"><label>时间</label><input class="inp" id="efTime" type="date" value="${todayStr()}" max="${todayStr()}"></div>
      <div class="field"><label>人情值</label>
        <div class="stepper"><button data-act="wstep2" data-arg="-1">−</button><span id="efWeight">${EVENT_TYPES.meal.dHeat}</span><button data-act="wstep2" data-arg="1">＋</button></div>
      </div>
    </div>
    <div class="field"><label>备注（可选）</label><textarea class="inp" id="efNote"></textarea></div>
    <button class="btn primary block" data-act="eventSubmitModal">保存</button>
  `, true);
  window.__modalType = 'meal'; window.__modalWeight = EVENT_TYPES.meal.dHeat;
}

/* ---------- 提醒表单 ---------- */
function reminderModal(personId) {
  const p = personId ? state.persons.find(x => x.id === personId) : null;
  const opts = state.persons.map(x => `<option value="${x.id}" ${x.id === personId ? 'selected' : ''}>${esc(x.name)} · ${esc(x.identity || '')}</option>`).join('');
  openSheet('添加提醒', `
    <div class="field"><label>关联人</label>${p
      ? `<div class="sub" style="margin-top:2px">${esc(p.name)}</div>`
      : `<select class="inp" id="rfPerson"><option value="">— 选择人脉 —</option>${opts}</select>`}</div>
    <div class="field"><label>提醒内容</label><input class="inp" id="rfContent" placeholder="例如：请老张吃饭还人情"></div>
    <div class="field"><label>日期</label><input class="inp" id="rfDate" type="date" value="${todayStr()}"></div>
    <button class="btn primary block" data-act="reminderSubmit" data-arg="${personId || ''}">保存</button>
  `, true);
}

/* ---------- 情景玩法 ---------- */
function scenarioModal(id) {
  const s = SCENARIOS.find(x => x.id === id);
  if (!s) return;
  const dc = DIFFS[s.diff];
  openSheet(`${s.tag} · ${s.title}`, `
    <div style="display:flex;gap:6px;margin-bottom:10px"><span class="chip ${dc.chip}">难度 · ${s.diff}（智慧值 ×${dc.w}）</span></div>
    <div class="sub" style="margin-bottom:14px;line-height:1.7">${s.scene}</div>
    <div class="sub" style="margin-bottom:10px;color:var(--teal)">如果是你，你会怎么应对？</div>
    ${s.choices.map((c, i) => `<button class="choice" data-act="choice" data-arg="${id}|${i}"><span class="ck">${['A', 'B', 'C', 'D'][i]}</span>${esc(c.t)}</button>`).join('')}
  `, true);
}
function showResult(sc, i, nextId) {
  const c = sc.choices[i];
  const cls = c.s >= 80 ? 'result-good' : c.s >= 50 ? 'result-mid' : 'result-bad';
  const badge = c.s >= 80 ? 'green' : c.s >= 50 ? 'amber' : 'red';
  const dc = DIFFS[sc.diff];
  const pr = state.progress[sc.id] || { best: 0, times: 0 };
  if (c.s > pr.best) { state.progress[sc.id] = { best: c.s, times: pr.times + 1 }; store.save(); }
  $('#modal-root').innerHTML = `
    <div class="mask center">
      <div class="sheet center">
        <div class="shead"><h2>${sc.tag} · ${sc.title}</h2><button class="sclose" data-act="closeModal">✕</button></div>
        <div class="sbody">
          <div class="sub" style="margin-bottom:12px">${sc.scene}</div>
          <div class="card" style="margin:0 0 12px;padding:12px 14px">
            <div class="sub" style="margin-bottom:6px">你的选择：</div>
            <div style="font-size:14px;font-weight:600">${['A', 'B', 'C', 'D'][i]}. ${esc(c.t)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <span class="chip ${badge}" style="font-size:13px;padding:5px 12px">处世指数 ${c.s}</span>
            <span class="chip ${dc.chip}">${sc.diff} ×${dc.w}</span>
            <span class="sub">最高纪录 ${Math.max(pr.best, c.s)} 分</span>
          </div>
          <div class="sub" style="margin:0 0 8px;color:var(--teal)">本局智慧值 +${Math.round(c.s * dc.w)}（含难度加成）</div>
          <div class="result-box ${cls}">${c.r}</div>
          <div class="card" style="border-color:rgba(127,174,131,.4)">
            <h3>人情点拨</h3>
            <div class="sub" style="margin-top:6px">${sc.tip}</div>
          </div>
          <div style="display:flex;gap:8px;margin-top:14px">
            <button class="btn" style="flex:1" data-act="nextScenario" data-arg="${nextId}">再练一个</button>
            <button class="btn primary" style="flex:1" data-act="closeModal">完成</button>
          </div>
        </div>
      </div>
    </div>`;
}

/* ---------------- 9. 演示数据 ---------------- */
function loadDemo() {
  const now = Date.now();
  const mk = (name, identity, tags, birthday, note, adjust) => ({ id: uid(), name, identity, tags, birthday, note, adjust, createdAt: now - Math.random() * 90 * DAY });
  const p = {
    wang: mk('王总', '领导', ['直属领导', '关键人脉'], '03-15', '年底评审、明年晋升的关键人物', 0),
    zhang: mk('老张', '朋友', ['大学死党', '球友'], '07-22', '从大学好到现在，无话不谈', 5),
    chen: mk('陈姐', '客户', ['合作三年', '大客户'], '10-08', '项目负责人，续约前多走动', -3),
    li: mk('李叔', '邻居', ['热心肠'], '', '上次帮我搬过家，得找机会还人情', 0),
    ming: mk('阿明', '同学', ['老同学'], '', '借了钱一直没还，见面尴尬', 0),
    dad: mk('老爸', '家人', [], '05-01', '', 0)
  };
  const ev = (personId, type, title, days, weight, note) => ({ id: uid(), personId, type, title, time: now - days * DAY, weight, note: note || '' });
  state.persons = [p.wang, p.zhang, p.chen, p.li, p.ming, p.dad];
  state.events = [
    ev(p.wang.id, 'meal', '部门团建饭局', 10, 7, ''),
    ev(p.wang.id, 'help_them', '帮我协调了跨部门资源', 12, 8, '招标会之前'),
    ev(p.wang.id, 'greeting', '春节祝福', 40, 3, ''),
    ev(p.zhang.id, 'meal', '周五撸串', 3, 7, '聊到半夜'),
    ev(p.zhang.id, 'talk', '深夜谈心', 15, 5, ''),
    ev(p.zhang.id, 'help_them', '借车给我用了一周', 40, 8, ''),
    ev(p.zhang.id, 'gift_give', '他生日我送了机械键盘', 60, 4, ''),
    ev(p.chen.id, 'meal', '项目庆功宴', 20, 7, ''),
    ev(p.chen.id, 'gift_get', '收到中秋礼盒', 55, 4, ''),
    ev(p.chen.id, 'help_them', '介绍了一个靠谱供应商', 70, 6, ''),
    ev(p.li.id, 'help_them', '借了他家车位用了一周', 5, 8, ''),
    ev(p.li.id, 'help_me', '我帮他搬了家', 45, 6, ''),
    ev(p.ming.id, 'greeting', '去年春节拜年', 220, 3, ''),
    ev(p.ming.id, 'money', '借了5000还没还', 150, 8, '一直拖着，见面尴尬'),
    ev(p.dad.id, 'meal', '周末回家吃饭', 7, 7, ''),
    ev(p.dad.id, 'greeting', '打电话问候', 12, 3, ''),
    ev(p.dad.id, 'gift_give', '给他买了按摩仪', 35, 4, '')
  ];
  state.reminders = [
    { id: uid(), personId: p.zhang.id, content: '请老张吃顿饭，还上次借车的人情', date: fmtDate(now + 3 * DAY), status: 'pending' },
    { id: uid(), personId: p.wang.id, content: '王总生日，发条祝福', date: fmtDate(now + 6 * DAY), status: 'pending' }
  ];
  // 修炼进度：演示数据带一点处世智慧，五维雷达不再缺一角（35 分 = 「人情通达」段位）
  state.progress = { wedding: { best: 40, times: 2 } };
  state.streak = { n: 2, last: fmtDate(now) };
  invalidateCache(); store.save(); render();
  toast('已载入 6 位人脉演示数据，可在「我的」里清空重建');
}

/* ---------------- 10. 交互动作（事件委托） ---------------- */
function onClick(e) {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act, arg = el.dataset.arg;
  switch (act) {
    case 'go': {
      state.tab = arg; render();
      try { localStorage.setItem('rqsg_tab', arg); } catch (e) {}
      break;
    }

    case 'openPerson': openPerson(arg); break;
    case 'personForm': personForm(arg || ''); break;
    case 'personSubmit': {
      const name = $('#pfName').value.trim();
      if (!name) { toast('请填写姓名'); break; }
      const tags = $('#pfTags').value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
      const birth = toMMDD($('#pfBirth').value);
      const data = { name, identity: $('#pfIdentity').value, tags, birthday: birth, note: $('#pfNote').value.trim() };
      if (arg) {
        const p = state.persons.find(x => x.id === arg);
        if (p) Object.assign(p, data, { updatedAt: Date.now() });
        toast('已保存');
      } else {
        state.persons.push(Object.assign({ id: uid(), adjust: 0, createdAt: Date.now() }, data));
        toast('已添加 ' + name);
      }
      invalidateCache(); store.save();
      const pid = window.__curPerson;
      closeModal(); render();
      if (pid) openPerson(pid);
      break;
    }

    case 'delPerson': {
      confirmModal('删除后该人脉的所有往来记录与提醒都会一并删除，确定吗？', () => {
        /* 连同该人脉的往来记录与提醒一起备份：否则撤销后 events/reminders 已落盘丢失，
           人脉恢复了但记录永久消失（不可接受的静默数据丢失）。 */
        const backup = state.persons.find(x => x.id === arg);
        const backupEvents = state.events.filter(x => x.personId === arg);
        const backupReminders = state.reminders.filter(x => x.personId === arg);
        state.persons = state.persons.filter(x => x.id !== arg);
        state.events = state.events.filter(x => x.personId !== arg);
        state.reminders = state.reminders.filter(x => x.personId !== arg);
        invalidateCache(); store.save(); closeModal(); render();
        toastUndo('已删除「' + (backup ? backup.name : '') + '」', () => {
          if (backup) state.persons.push(backup);
          if (backupEvents.length) state.events = state.events.concat(backupEvents);
          if (backupReminders.length) state.reminders = state.reminders.concat(backupReminders);
          invalidateCache(); store.save(); render();
        });
      }, true);
      break;
    }

    case 'adjust': {
      const p = state.persons.find(x => x.id === window.__curPerson);
      if (!p) break;
      p.adjust = clamp((p.adjust || 0) + parseInt(arg, 10), -30, 30);
      invalidateCache(); store.save(); render(); openPerson(p.id); toast('热度已手动调整');
      break;
    }

    case 'typeSel': {
      state.evType = arg;
      $$('#view .typecell').forEach(c => c.classList.toggle('on', c.dataset.arg === arg));
      const w = $('#fWeight'); if (w) w.textContent = EVENT_TYPES[arg].dHeat;
      const ph = $('#fTitle'); if (ph) ph.placeholder = EVENT_TYPES[arg].label + '，例如：' + (PLACEHOLDERS[arg] || '');
      break;
    }
    case 'wstep': {
      const s = $('#fWeight'); const v = clamp(parseInt(s.textContent) + parseInt(arg, 10), -20, 20);
      s.textContent = v; break;
    }
    case 'eventSubmit': {
      const pid = $('#fPerson').value;
      if (!pid) { toast('先选择关联人'); break; }
      const title = $('#fTitle').value.trim() || EVENT_TYPES[state.evType].label;
      const dtv = $('#fTime').value;
      const t = Math.min(dtv ? new Date(dtv + 'T00:00:00').getTime() : Date.now(), Date.now()); // 日期留空按今天
      const ev = { id: uid(), personId: pid, type: state.evType, title, time: t, weight: parseInt($('#fWeight').textContent, 10), note: $('#fNote').value.trim() };
      state.events.push(ev); state.lastEventId = ev.id; state.evPersonId = pid;
      invalidateCache(); store.save(); $('#fTitle').value = ''; $('#fNote').value = '';
      toast('已记录一笔「' + EVENT_TYPES[state.evType].label + '」');
      render();
      break;
    }
    case 'undoLast': {
      if (!state.lastEventId) break;
      const backup = state.events.find(x => x.id === state.lastEventId);
      state.events = state.events.filter(x => x.id !== state.lastEventId);
      state.lastEventId = null; invalidateCache(); store.save(); render();
      toastUndo('已撤销上一条', () => { if (backup) state.events.push(backup); invalidateCache(); store.save(); render(); });
      break;
    }

    case 'eventModal': eventModal(arg); break;
    case 'eventQuick': eventModal(arg); break;
    case 'festTip': toast('节日提醒：记得给重要的人送上祝福、走动一下'); break;
    case 'allEvents': openAllEvents(); break;
    case 'modalType': {
      window.__modalType = arg; window.__modalWeight = EVENT_TYPES[arg].dHeat;
      const w = document.getElementById('efWeight'); if (w) w.textContent = window.__modalWeight;
      $$('#efTypes .typecell').forEach(c => c.classList.toggle('on', c.dataset.arg === arg));
      break;
    }
    case 'wstep2': {
      const w = document.getElementById('efWeight'); if (!w) break;
      window.__modalWeight = clamp((window.__modalWeight || 6) + parseInt(arg, 10), -20, 20);
      w.textContent = window.__modalWeight; break;
    }
    case 'eventSubmitModal': {
      const pid = $('#efPerson').value;
      if (!pid) { toast('先选择关联人'); break; }
      const title = $('#efTitle').value.trim() || EVENT_TYPES[window.__modalType].label;
      const dtv = $('#efTime').value;
      const t = Math.min(dtv ? new Date(dtv + 'T00:00:00').getTime() : Date.now(), Date.now()); // 日期留空按今天
      const ev = { id: uid(), personId: pid, type: window.__modalType, title, time: t, weight: window.__modalWeight || 6, note: $('#efNote').value.trim() };
      state.events.push(ev); state.lastEventId = ev.id; state.evPersonId = pid;
      invalidateCache(); store.save();
      const fromDetail = window.__curPerson;
      closeModal(); render();
      if (fromDetail) openPerson(fromDetail);
      const wgt = ev.weight;
      toast('已记录，人情值 ' + (wgt > 0 ? '+' : '') + wgt);
      break;
    }

    case 'reminderModal': reminderModal(arg); break;
    case 'reminderSubmit': {
      const content = $('#rfContent').value.trim();
      if (!content) { toast('请填写提醒内容'); break; }
      let pid = arg;
      const rsel = document.getElementById('rfPerson');
      if (!pid && rsel) pid = rsel.value;
      if (!pid) { toast('先选择关联人'); break; }
      state.reminders.push({ id: uid(), personId: pid, content, date: $('#rfDate').value || '', status: 'pending' });
      store.save();
      const wasDetail = window.__curPerson;
      closeModal(); render();
      if (wasDetail) openPerson(wasDetail);
      toast('提醒已添加');
      break;
    }
    case 'toggleReminder': {
      const r = state.reminders.find(x => x.id === arg);
      if (!r) break;
      r.status = r.status === 'done' ? 'pending' : 'done';
      store.save();
      toast(r.status === 'done' ? '已完成' : '已恢复为待办');
      const pid = r.personId;
      closeModal(); openPerson(pid);
      break;
    }
    case 'quickDone': case 'reminderDone': {
      const r = state.reminders.find(x => x.id === arg);
      if (!r) break;
      r.status = 'done'; store.save(); render(); toast('提醒已完成');
      break;
    }
    case 'delReminder': {
      confirmModal('删除这条提醒？', () => {
        const backup = state.reminders.find(x => x.id === arg);
        state.reminders = state.reminders.filter(x => x.id !== arg);
        store.save(); render();
        toastUndo('提醒已删除', () => { if (backup) state.reminders.push(backup); store.save(); render(); });
      }, true);
      break;
    }
    case 'installApp': {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => { deferredPrompt = null; render(); });
      } else {
        toast('在 Safari 打开本页，点分享 → 添加到主屏幕');
      }
      break;
    }
    case 'iosHintClose': lsSet('rqsg_ios_hint', '1'); render(); break;

    case 'scenario': scenarioModal(arg); break;
    case 'choice': {
      const [sid, i] = arg.split('|');
      const sc = SCENARIOS.find(x => x.id === sid);
      if (!sc) break;
      /* 连续修炼打卡 */
      const today = todayStr();
      const sk = state.streak || { n: 0, last: '' };
      if (sk.last !== today) {
        sk.n = sk.last === fmtDate(Date.now() - DAY) ? sk.n + 1 : 1;
        sk.last = today; state.streak = sk; store.save();
      }
      const idx = SCENARIOS.findIndex(x => x.id === sid);
      const nextId = SCENARIOS[(idx + 1) % SCENARIOS.length].id;
      render(); /* 刷新底层智慧值 / 段位 / 指数 */
      showResult(sc, parseInt(i, 10), nextId);
      break;
    }
    case 'nextScenario': scenarioModal(arg); break;

    case 'filterId': state.identity = arg; render(); break;
    case 'sortBy': state.sortBy = arg; render(); break;
    case 'trainDiff': state.trainDiff = arg; render(); break;
    case 'dimInsight': openDimInsight(arg); break;
    case 'indexInfo': openIndexInfo(); break;
    case 'export': store.export(); toast('备份已导出'); break;
    case 'exportCsv': store.exportCsv(); toast('人脉清单已导出（CSV）'); break;
    case 'annualReport': openAnnualReport(); break;
    case 'exportAnnualPng': exportAnnualPng(); break;
    case 'copyBackup': {
      const txt = backupText();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(() => toast('备份已复制，可在新设备「粘贴导入」'))
          .catch(() => openClipboard());
      } else openClipboard();
      break;
    }
    case 'pasteImport': openClipboardImport(); break;
    case 'clipboardSubmit': {
      const raw = (document.getElementById('cbText') || {}).value || '';
      if (!raw.trim()) { toast('请先粘贴备份内容'); break; }
      try {
        const d = JSON.parse(raw);
        if (!d || !Array.isArray(d.persons)) throw new Error('bad');
        if (state.persons.length) {
          confirmModal('导入会覆盖当前所有数据（建议先导出备份）。确定继续吗？', () => store.applyImport(d), true);
        } else {
          store.applyImport(d);
        }
      } catch (e) { toast('导入失败：内容格式不对'); }
      break;
    }
    case 'import': { const f = $('#importFile'); if (f) f.click(); break; }
    case 'reset': {
      confirmModal('确定清空所有数据？此操作不可恢复，建议先导出备份。', () => {
        const backupPersons = state.persons.slice();
        const backupEvents = state.events.slice();
        const backupReminders = state.reminders.slice();
        const backupProgress = Object.assign({}, state.progress);
        const backupStreak = Object.assign({}, state.streak);
        state.persons = []; state.events = []; state.reminders = []; state.progress = {};
        state.streak = { n: 0, last: '' }; state.lastEventId = null;
        state.filter = ''; state.identity = 'all'; state.sortBy = 'heat'; state.trainDiff = '全部'; state.tab = 'radar';
        try { localStorage.setItem('rqsg_tab', 'radar'); } catch (e) {}
        invalidateCache(); store.save(); closeModal(); render();
        toastUndo('数据已清空', () => {
          state.persons = backupPersons; state.events = backupEvents; state.reminders = backupReminders;
          state.progress = backupProgress; state.streak = backupStreak;
          invalidateCache(); store.save(); render();
        });
      }, true);
      break;
    }
    case 'delEvent': {
      confirmModal('删除这条往来记录？删除后相关热度会重新计算。', () => {
        const backup = state.events.find(x => x.id === arg);
        state.events = state.events.filter(x => x.id !== arg);
        if (state.lastEventId === arg) state.lastEventId = null;
        invalidateCache(); store.save();
        const pid = window.__curPerson;
        closeModal();
        if (pid) openPerson(pid); else render();
        toastUndo('已删除这条记录', () => {
          if (backup) state.events.push(backup);
          invalidateCache(); store.save();
          const pid2 = window.__curPerson; if (pid2) openPerson(pid2); else render();
        });
      }, true);
      break;
    }
    case 'demo': loadDemo(); break;
    case 'welcomeDemo': { try { localStorage.setItem('rqsg_welcomed', '1'); } catch (e) {} closeModal(); loadDemo(); break; }
    case 'welcomeGo': { try { localStorage.setItem('rqsg_welcomed', '1'); } catch (e) {} closeModal(); state.tab = 'persons'; render(); break; }
    case 'closeModal': closeModal(); break;
    case 'confirmOk': confirmOk(); break;
    case 'confirmCancel': confirmCancel(); break;
    case 'toastUndo': {
      const fn = window.__undoFn; window.__undoFn = null;
      clearTimeout(toastTimer);
      const t = $('#toast-root'); if (t) t.classList.remove('show');
      if (fn) fn();
      break;
    }
    case 'closeToast': closeToast(); break;
  }
}
function onChange(e) {
  const el = e.target.closest('[data-change]');
  if (!el) return;
  const act = el.dataset.change;
  if (act === 'evPerson') state.evPersonId = el.value;
  else if (act === 'importFile') { if (el.files && el.files[0]) store.import(el.files[0]); el.value = ''; }
}
/* 搜索：input 实时筛选，保持焦点（IME 组合期间不重建） */
/* 搜索防抖定时器（见下方 onInput 的 search 分支） */
let _searchTimer = null;
function onInput(e) {
  const el = e.target.closest('[data-change]');
  if (!el || el.dataset.ime) return;
  const act = el.dataset.change;
  if (act === 'search') {
    state.filter = el.value;
    /* 防抖：原本每敲一个字符就整页 render()（含图表重建），输入会明显卡顿且焦点闪烁。
       改为停止输入 180ms 后再渲染，输入框在此期间保持原焦点不被重建。 */
    if (_searchTimer) clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => {
      _searchTimer = null;
      render();
      const si = $('#fSearch');
      if (si) { si.focus(); const v = si.value; si.setSelectionRange(v.length, v.length); }
    }, 180);
  }
}
document.addEventListener('click', onClick);
document.addEventListener('change', onChange);
document.addEventListener('input', onInput);
document.addEventListener('compositionstart', (e) => { if (e.target && e.target.setAttribute) e.target.setAttribute('data-ime', '1'); });
document.addEventListener('compositionend', (e) => { if (e.target && e.target.removeAttribute) e.target.removeAttribute('data-ime'); });
/* ESC 关闭弹层：此前完全没有键盘处理，弹层只能靠鼠标点 ✕ 关闭，
   键盘用户会被卡住（删除确认这类危险弹层尤其难受）。 */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' && e.key !== 'Esc') return;
  const root = $('#modal-root');
  if (root && root.innerHTML.trim()) closeModal();
});

/* 弹层遮罩点击关闭 */
document.addEventListener('click', (e) => {
  if (e.target.classList && e.target.classList.contains('mask')) closeModal();
});

/* 首次使用品牌欢迎（只出现一次） */
function showWelcome() {
  try { localStorage.setItem('rqsg_welcomed', '1'); } catch (e) {}
  openSheet(`欢迎使用 ${BRAND.name}`, `
    <div class="welcome-svg">${LOGO_SVG}</div>
    <div style="text-align:center">
      <div style="font-size:17px;font-weight:700;font-family:var(--kaiti);letter-spacing:2px">把人情账记明白</div>
      <div class="sub" style="text-align:center;margin-top:6px">把关系经营成细水长流 —— 三步上手：</div>
    </div>
    <div class="wsteps">
      <div class="wstep"><span class="n">1</span><div class="t">在<b>「人脉」</b>里添加生命中重要的人：身份、标签、生日，一次记齐</div></div>
      <div class="wstep"><span class="n">2</span><div class="t">饭局散场前<b>10 秒记一笔</b>往来，雷达自动算出热度与人情账</div></div>
      <div class="wstep"><span class="n">3</span><div class="t">雷达<b>自动提醒</b>你该走动、该还人情、该送祝福；还可去修炼场练练手</div></div>
    </div>
    <div style="text-align:center"><span class="wtag">${BRAND.en}</span></div>
    <div style="display:flex;gap:8px;margin-top:16px">
      <button class="btn" style="flex:1" data-act="welcomeDemo">载入演示看看效果</button>
      <button class="btn primary" style="flex:1" data-act="welcomeGo">我自己来</button>
    </div>
  `, true);
}

/* ---------------- 安装为 App（PWA 轻应用） ---------------- */
let deferredPrompt = null;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || '');
const isStandalone = !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); deferredPrompt = e;
  if (state.tab === 'me') render();
});
function installCard() {
  if (isStandalone) return '';
  if (deferredPrompt) {
    return `<div class="card">
      <h3>装成 App 用</h3>
      <div class="sub" style="margin-top:6px">添加到主屏幕后可以全屏打开、离线使用，跟装了一个 App 一样。</div>
      <button class="btn primary" style="margin-top:10px" data-act="installApp">添加到主屏幕</button>
    </div>`;
  }
  if (isIOS && lsGet('rqsg_ios_hint') !== '1') {
    return `<div class="card">
      <h3>装成 App 用</h3>
      <div class="sub" style="margin-top:6px">在 Safari 里点底部「分享」，选「添加到主屏幕」，就能像 App 一样全屏使用、离线可用。</div>
      <button class="btn sm" style="margin-top:10px" data-act="iosHintClose">知道了</button>
    </div>`;
  }
  return '';
}

/* ---------------- 11. 启动 ---------------- */
function init() {
  store.load();
  const savedTab = lsGet('rqsg_tab');
  if (savedTab && ['radar', 'persons', 'record', 'train', 'me'].includes(savedTab)) state.tab = savedTab;
  render();
  if (!state.persons.length && lsGet('rqsg_welcomed') !== '1') {
    /* 首次打开：品牌欢迎引导 */
    showWelcome();
  }
}
init();

