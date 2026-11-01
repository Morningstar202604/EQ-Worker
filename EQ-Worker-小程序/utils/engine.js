// EQ-Worker · 小程序轻量版 v3.2.0
// 纯逻辑统一来自 ./core.bundle.js（生成文件，源在 packages/core）；
// 本文件只保留 wx 存储适配、页面所需的参数绑定，以及小程序特有的月度/趋势/年度聚合。
const core = require('./core.bundle.js');

let S;

/* 小程序的数据形状维持 Web v4：settings 只保留 giftTier / cityTier，
   不落 core 的 ai 配置与 meta（否则 save 的 schema 与 meta.schema 会互相矛盾）。 */
function newState() {
  const e = createEmptyState();
  return {
    persons: e.persons,
    events: e.events,
    reminders: e.reminders,
    progress: e.progress,
    streak: e.streak,
    lastEventId: null,
    settings: { giftTier: e.settings.giftTier, cityTier: e.settings.cityTier }
  };
}

const {
  DAY,
  uid,
  clamp,
  avg,
  esc,
  fmtDate,
  todayStr,
  toMMDD,
  toDateInput,
  daysUntil,
  solarToLunar,
  upcomingFestival,
  EVENT_TYPES,
  PLACEHOLDERS,
  DIFFS,
  LEVELS,
  SCENARIOS,
  createEmptyState,
  sanitizeImport
} = core;

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
function initials(name) { return (name || '?').slice(0, 1); }

/* 小程序仍按 Web v4 结构存取（与 legacy `_app_dev.js` 的 SCHEMA_VERSION 一致），
   不能直接采用 core 的 v5 常量，否则每次保存都会标记成未迁移版本。 */
const SCHEMA_VERSION = 4;

S = newState();

/* ---------------- 纯逻辑：从 core 绑定当前 state ---------------- */
function computePerson(p, now) { return core.computePerson(S, p, now); }

let _computeCache = {}, _eventVersion = 0;
function invalidateCache() { _computeCache = {}; _eventVersion++; }
function computedFor(personId, now) {
  const c = _computeCache[personId];
  if (c && c.__v === _eventVersion) return c.result;
  const p = S.persons.find(x => x.id === personId);
  const r = p ? core.computePerson(S, p, now) : null;
  _computeCache[personId] = { result: r, __v: _eventVersion };
  return r;
}

function overallMetrics(now) { return core.overallMetrics(S, now); }
function getWisdom() { return core.getWisdom(S); }
function getLevel(w) { return core.getLevel(w); }
function getSuggestion(p, now) { return core.getSuggestion(S, p, now); }
function relationRead(p, now) { return core.relationRead(S, p, now); }
function personLedger(personId) { return core.personLedger(S, personId); }
function giftAdvice(personId, occasion, opts) { return core.giftAdvice(S, personId, occasion, opts); }
function personHealth(p, now) { return core.personHealth(S, p, now); }
function buildActions(limit, now) { return core.buildActions(S, limit, now); }
function buildScripts(sceneId, personId, context) { return core.buildScripts(S, sceneId, personId, context); }
function upcomingDates(days, now) { return core.upcomingDates(S, days, now); }

const LEVEL_BY_CLS = { red: 0, amber: 1, teal: 2, blue: 3 };
function buildAlerts(now) {
  return core.buildAlerts(S, now).map(a => ({
    ...a,
    icon: a.ic,
    level: LEVEL_BY_CLS[a.cls] == null ? 3 : LEVEL_BY_CLS[a.cls],
    text: String(a.text).replace(/<\/?b>/g, '')
  }));
}
const wxAlerts = buildAlerts;

/* ---------------- 存储层（wx 本地缓存） ---------------- */
const DB_KEY = 'eqworker_mp_v1';
const LEGACY_DB_KEY = 'rqsg_radar_v2';

function _empty() {
  const e = newState();
  S.persons = e.persons;
  S.events = e.events;
  S.reminders = e.reminders;
  S.progress = e.progress;
  S.streak = e.streak;
  S.settings = e.settings;
  S.lastEventId = null;
  invalidateCache();
}

function applySettings(raw) {
  return { giftTier: raw.giftTier, cityTier: raw.cityTier };
}

function load() {
  try {
    let raw = wx.getStorageSync(DB_KEY);
    if (!raw) raw = wx.getStorageSync(LEGACY_DB_KEY);
    if (!raw) { _empty(); return S; }
    const d = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!d || !Array.isArray(d.persons)) { _empty(); return S; }
    const clean = sanitizeImport(d);
    S.persons = clean.persons; S.events = clean.events; S.reminders = clean.reminders;
    S.progress = clean.progress; S.streak = clean.streak; S.settings = applySettings(clean.settings);
    S.lastEventId = typeof d.lastEventId === 'string' ? d.lastEventId : null;
    invalidateCache();
    return S;
  } catch (e) { _empty(); return S; }
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
  S.progress = clean.progress; S.streak = clean.streak; S.settings = applySettings(clean.settings);
  S.lastEventId = typeof d.lastEventId === 'string' ? d.lastEventId : null;
  save();
  invalidateCache();
  return S;
}

/* ---------------- 月度 / 年度 / 趋势 数据（小程序特有聚合，保留本地实现） ---------------- */
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
  clamp, avg, esc,
  solarToLunar, upcomingFestival,
  EVENT_TYPES, PLACEHOLDERS, IDENTITIES: ['领导', '同事', '客户', '朋友', '家人', '长辈', '其他'],
  SCHEMA_VERSION, computePerson, computedFor, invalidateCache,
  overallMetrics, getWisdom, getLevel, DIFFS, LEVELS,
  buildAlerts, wxAlerts, getSuggestion, relationRead,
  personLedger, giftAdvice, personHealth, buildActions, buildScripts, upcomingDates,
  SCENARIOS, monthData, trendData, annualData
};
