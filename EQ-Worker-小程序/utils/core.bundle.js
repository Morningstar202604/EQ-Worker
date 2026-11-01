// EQ-Worker 小程序 core 生成文件，勿手改；源在 packages/core。
// 重新生成：node scripts/build-mini-core.mjs
// esbuild 0.25.12 · target es2019 · format cjs · platform neutral
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/core/src/index.ts
var index_exports = {};
__export(index_exports, {
  AI_KEY: () => AI_KEY,
  CITY_TIERS: () => CITY_TIERS,
  DAY: () => DAY,
  DB_KEY: () => DB_KEY,
  DEFAULT_AI: () => DEFAULT_AI,
  DEFAULT_SETTINGS: () => DEFAULT_SETTINGS,
  DIFFS: () => DIFFS,
  EVENT_TYPES: () => EVENT_TYPES,
  GIFT_BASE: () => GIFT_BASE,
  GIFT_TIERS: () => GIFT_TIERS,
  IDENTITIES: () => IDENTITIES,
  LEDGER_STATUS: () => LEDGER_STATUS,
  LEGACY_DB_KEYS: () => LEGACY_DB_KEYS,
  LEVELS: () => LEVELS,
  NICE_AMOUNTS: () => NICE_AMOUNTS,
  OCCASIONS: () => OCCASIONS,
  PLACEHOLDER: () => PLACEHOLDER,
  PLACEHOLDERS: () => PLACEHOLDERS,
  SCENARIOS: () => SCENARIOS,
  SCHEMA_VERSION: () => SCHEMA_VERSION,
  SCRIPT_SCENES: () => SCRIPT_SCENES,
  SCRIPT_TONES: () => SCRIPT_TONES,
  avg: () => avg,
  buildActions: () => buildActions,
  buildAlerts: () => buildAlerts,
  buildICS: () => buildICS,
  buildScripts: () => buildScripts,
  clamp: () => clamp,
  computePerson: () => computePerson,
  computedFor: () => computedFor,
  createEmptyState: () => createEmptyState,
  createLocalAdapter: () => createLocalAdapter,
  createMemoryAdapter: () => createMemoryAdapter,
  createStore: () => createStore,
  daysUntil: () => daysUntil,
  detectSchema: () => detectSchema,
  esc: () => esc,
  eventDir: () => eventDir,
  fmtDate: () => fmtDate,
  fmtMoney: () => fmtMoney,
  getLevel: () => getLevel,
  getSuggestion: () => getSuggestion,
  getWisdom: () => getWisdom,
  giftAdvice: () => giftAdvice,
  healthRanking: () => healthRanking,
  ledgerInsights: () => ledgerInsights,
  ledgerNetLabel: () => ledgerNetLabel,
  ledgerNetShort: () => ledgerNetShort,
  ledgerTotals: () => ledgerTotals,
  migrate: () => migrate,
  nextMMDD: () => nextMMDD,
  niceAmount: () => niceAmount,
  normalizeSettings: () => normalizeSettings,
  overallMetrics: () => overallMetrics,
  personHealth: () => personHealth,
  personLedger: () => personLedger,
  relationRead: () => relationRead,
  sanitizeImport: () => sanitizeImport,
  settlePrefill: () => settlePrefill,
  solarToLunar: () => solarToLunar,
  toDateInput: () => toDateInput,
  toMMDD: () => toMMDD,
  todayStr: () => todayStr,
  uid: () => uid,
  upcomingDates: () => upcomingDates,
  upcomingFestival: () => upcomingFestival,
  wisdomFull: () => wisdomFull
});
module.exports = __toCommonJS(index_exports);

// packages/core/src/constants.ts
var EVENT_TYPES = {
  help_them: { label: "\u5BF9\u65B9\u5E2E\u4E86\u6211", dHeat: 6, dTrust: 6, dIntimacy: 4, dDebt: 8 },
  help_me: { label: "\u6211\u5E2E\u4E86\u5BF9\u65B9", dHeat: 6, dTrust: 5, dIntimacy: 3, dDebt: -4 },
  meal: { label: "\u996D\u5C40/\u805A\u4F1A", dHeat: 7, dTrust: 2, dIntimacy: 6, dDebt: 0 },
  gift_get: { label: "\u6536\u793C", dHeat: 4, dTrust: 2, dIntimacy: 3, dDebt: 6 },
  gift_give: { label: "\u9001\u793C", dHeat: 4, dTrust: 2, dIntimacy: 3, dDebt: -3 },
  money: { label: "\u91D1\u94B1\u5F80\u6765", dHeat: 5, dTrust: 4, dIntimacy: 0, dDebt: 4 },
  talk: { label: "\u8C08\u5FC3/\u6DF1\u804A", dHeat: 5, dTrust: 7, dIntimacy: 7, dDebt: 0 },
  greeting: { label: "\u95EE\u5019/\u795D\u798F", dHeat: 3, dTrust: 1, dIntimacy: 2, dDebt: 0 },
  conflict: { label: "\u51B2\u7A81/\u6469\u64E6", dHeat: -10, dTrust: -6, dIntimacy: -6, dDebt: 0 },
  other: { label: "\u5176\u4ED6", dHeat: 2, dTrust: 1, dIntimacy: 1, dDebt: 0 }
};
var OCCASIONS = ["\u65E5\u5E38", "\u751F\u65E5", "\u5A5A\u793C", "\u6EE1\u6708", "\u4E54\u8FC1", "\u63A2\u75C5", "\u8282\u65E5", "\u8FD8\u793C", "\u5176\u4ED6"];
var GIFT_TIERS = {
  simple: { label: "\u4ECE\u7B80", mult: 0.7 },
  standard: { label: "\u5F97\u4F53", mult: 1 },
  generous: { label: "\u91CD\u89C6", mult: 1.3 }
};
var CITY_TIERS = { \u4E09\u7EBF: 0.8, \u4E8C\u7EBF: 1, \u4E00\u7EBF: 1.25 };
var GIFT_BASE = {
  \u9886\u5BFC: { \u751F\u65E5: 500, \u5A5A\u793C: 1e3, \u6EE1\u6708: 800, \u4E54\u8FC1: 500, \u63A2\u75C5: 500, \u8282\u65E5: 500, \u8FD8\u793C: 500, \u65E5\u5E38: 300, \u5176\u4ED6: 500 },
  \u540C\u4E8B: { \u751F\u65E5: 200, \u5A5A\u793C: 500, \u6EE1\u6708: 500, \u4E54\u8FC1: 300, \u63A2\u75C5: 300, \u8282\u65E5: 200, \u8FD8\u793C: 300, \u65E5\u5E38: 200, \u5176\u4ED6: 200 },
  \u5BA2\u6237: { \u751F\u65E5: 300, \u5A5A\u793C: 800, \u6EE1\u6708: 600, \u4E54\u8FC1: 500, \u63A2\u75C5: 500, \u8282\u65E5: 500, \u8FD8\u793C: 500, \u65E5\u5E38: 300, \u5176\u4ED6: 300 },
  \u670B\u53CB: { \u751F\u65E5: 200, \u5A5A\u793C: 600, \u6EE1\u6708: 500, \u4E54\u8FC1: 300, \u63A2\u75C5: 300, \u8282\u65E5: 200, \u8FD8\u793C: 300, \u65E5\u5E38: 200, \u5176\u4ED6: 200 },
  \u5BB6\u4EBA: { \u751F\u65E5: 500, \u5A5A\u793C: 1600, \u6EE1\u6708: 1e3, \u4E54\u8FC1: 800, \u63A2\u75C5: 800, \u8282\u65E5: 500, \u8FD8\u793C: 500, \u65E5\u5E38: 300, \u5176\u4ED6: 500 },
  \u957F\u8F88: { \u751F\u65E5: 500, \u5A5A\u793C: 1200, \u6EE1\u6708: 1e3, \u4E54\u8FC1: 500, \u63A2\u75C5: 600, \u8282\u65E5: 500, \u8FD8\u793C: 500, \u65E5\u5E38: 300, \u5176\u4ED6: 500 },
  \u540C\u5B66: { \u751F\u65E5: 200, \u5A5A\u793C: 600, \u6EE1\u6708: 500, \u4E54\u8FC1: 300, \u63A2\u75C5: 300, \u8282\u65E5: 200, \u8FD8\u793C: 300, \u65E5\u5E38: 200, \u5176\u4ED6: 200 },
  \u90BB\u5C45: { \u751F\u65E5: 200, \u5A5A\u793C: 500, \u6EE1\u6708: 500, \u4E54\u8FC1: 300, \u63A2\u75C5: 300, \u8282\u65E5: 200, \u8FD8\u793C: 300, \u65E5\u5E38: 200, \u5176\u4ED6: 200 },
  \u5176\u4ED6: { \u751F\u65E5: 200, \u5A5A\u793C: 500, \u6EE1\u6708: 500, \u4E54\u8FC1: 300, \u63A2\u75C5: 300, \u8282\u65E5: 200, \u8FD8\u793C: 300, \u65E5\u5E38: 200, \u5176\u4ED6: 200 }
};
var LEDGER_STATUS = {
  owe: { label: "\u6211\u6B20\u5BF9\u65B9", cls: "amber" },
  due: { label: "\u5BF9\u65B9\u6B20\u6211", cls: "blue" },
  clear: { label: "\u4E24\u6E05", cls: "teal" }
};
var NICE_AMOUNTS = [0, 50, 100, 200, 300, 500, 600, 800, 1e3, 1200, 1500, 1600, 2e3, 3e3, 5e3, 8e3, 1e4];
var LEVELS = [
  { min: 0, name: "\u4EBA\u60C5\u5C0F\u767D", desc: "\u521A\u5165\u95E8\uFF0C\u591A\u7559\u5FC3\u8EAB\u8FB9\u4EBA\u7684\u611F\u53D7" },
  { min: 15, name: "\u7565\u61C2\u4E16\u6545", desc: "\u5F00\u59CB\u61C2\u5206\u5BF8\uFF0C\u7EE7\u7EED\u6512\u7ECF\u9A8C" },
  { min: 35, name: "\u4EBA\u60C5\u901A\u8FBE", desc: "\u5F85\u4EBA\u63A5\u7269\u6709\u7AE0\u6CD5\uFF0C\u5708\u5B50\u8D8A\u8D70\u8D8A\u5BBD" },
  { min: 60, name: "\u4EBA\u60C5\u5927\u5E08", desc: "\u793C\u5C1A\u5F80\u6765\u62FF\u634F\u5F97\u5F53\uFF0C\u5DE6\u53F3\u9022\u6E90" },
  { min: 85, name: "\u4EBA\u60C5\u5B97\u5E08", desc: "\u4E16\u4E8B\u6D1E\u660E\u7686\u5B66\u95EE\uFF0C\u4EBA\u60C5\u7EC3\u8FBE\u5373\u6587\u7AE0" }
];
var DIFFS = {
  \u5165\u95E8: { w: 1, chip: "chip teal" },
  \u8FDB\u9636: { w: 1.25, chip: "chip amber" },
  \u9AD8\u624B: { w: 1.5, chip: "chip red" }
};
var IDENTITIES = ["\u9886\u5BFC", "\u540C\u4E8B", "\u5BA2\u6237", "\u670B\u53CB", "\u5BB6\u4EBA", "\u957F\u8F88", "\u540C\u5B66", "\u90BB\u5C45", "\u5176\u4ED6"];
var SCENARIOS = [
  {
    id: "wedding",
    diff: "\u5165\u95E8",
    tag: "\u793C\u5C1A\u5F80\u6765",
    title: "\u540C\u4E8B\u7ED3\u5A5A\uFF0C\u968F\u591A\u5C11\u793C\uFF1F",
    scene: "\u5173\u7CFB\u4E00\u822C\u7684\u540C\u4E8B\u5C0F\u5468\u4E0B\u6708\u529E\u5A5A\u793C\uFF0C\u8BF7\u4E86\u5168\u90E8\u95E8\u3002\u4F60\u6708\u85AA\u5230\u624B 8 \u5343\uFF0C\u540C\u4E8B\u4EEC\u79C1\u4E0B\u90FD\u5728\u804A\u300C\u968F\u591A\u5C11\u5408\u9002\u300D\u3002",
    choices: [
      { t: "\u968F 200\uFF0C\u4EBA\u5230\u573A", s: 30, r: "\u660E\u663E\u4F4E\u4E8E\u4E00\u822C\u884C\u60C5\uFF0C\u5E2D\u95F4\u5BB9\u6613\u4F20\u6210\u300C\u62A0\u95E8\u300D\uFF0C\u4EBA\u60C5\u6CA1\u6512\u5230\u53CD\u843D\u8BDD\u67C4\u3002" },
      { t: "\u968F\u5F53\u5730\u4E00\u822C\u884C\u60C5\uFF08\u7EA6 600\uFF09\uFF0C\u4EBA\u5230\u573A", s: 90, r: "\u7B26\u5408\u884C\u60C5\u3001\u4F53\u9762\u4E0D\u5931\u5206\u5BF8\uFF0C\u540C\u4E8B\u5173\u7CFB\u5E73\u7A33\u52A0\u5206\uFF0C\u65E5\u540E\u5BF9\u65B9\u4E5F\u4F1A\u5FF5\u4F60\u7684\u60C5\u3002" },
      { t: "\u968F 1000 \u6253\u5E95", s: 55, r: "\u8D85\u51FA\u4E86\u4F60\u4EEC\u5173\u7CFB\u7684\u4EB2\u5BC6\u5EA6\uFF0C\u5BF9\u65B9\u6536\u7740\u6709\u538B\u529B\uFF0C\u4F60\u81EA\u5DF1\u4E5F\u8089\u75BC\uFF0C\u8FD8\u62AC\u9AD8\u4E86\u4E0B\u6B21\u7684\u884C\u60C5\u3002" },
      { t: "\u968F 300\uFF0C\u8BF4\u6700\u8FD1\u624B\u5934\u7D27", s: 60, r: "\u7565\u4F4E\u4E8E\u884C\u60C5\uFF0C\u5173\u7CFB\u4E00\u822C\u7684\u540C\u4E8B\u80FD\u63A5\u53D7\uFF0C\u4F46\u9762\u5B50\u4E0A\u7A0D\u6B20\uFF0C\u81F3\u5C11\u522B\u4F4E\u4E8E 500\u3002" }
    ],
    tip: "\u968F\u793C\u8BB2\u7A76\u300C\u884C\u60C5 + \u5173\u7CFB\u300D\uFF1A\u5148\u6253\u542C\u672C\u5730\u884C\u60C5\uFF0C\u518D\u6309\u4EB2\u758F\u52A0\u51CF\u3002\u5B81\u53EF\u5230\u4F4D\uFF0C\u4E0D\u8981\u8BA9\u4EBA\u80CC\u540E\u8BAE\u8BBA\u3002"
  },
  {
    id: "toast",
    diff: "\u8FDB\u9636",
    tag: "\u996D\u5C40\u9152\u684C",
    title: "\u9886\u5BFC\u656C\u9152\u8BF4\u300C\u4F60\u968F\u610F\u300D",
    scene: "\u90E8\u95E8\u805A\u9910\uFF0C\u9886\u5BFC\u7AEF\u7740\u9152\u676F\u8D70\u5230\u4F60\u9762\u524D\uFF1A\u300C\u6211\u5E72\u4E86\uFF0C\u4F60\u968F\u610F\u3002\u300D",
    choices: [
      { t: "\u771F\u5C31\u968F\u610F\u62BF\u4E00\u53E3", s: 35, r: "\u9886\u5BFC\u8BF4\u300C\u968F\u610F\u300D\u662F\u5BA2\u6C14\u8BDD\uFF0C\u4F60\u5168\u76D8\u7167\u6536\uFF0C\u4ED6\u5FC3\u91CC\u4F1A\u5600\u5495\u4F60\u4E0D\u61C2\u4E8B\u3002" },
      { t: "\u8D77\u8EAB\u53CC\u624B\u6367\u676F\uFF1A\u300C\u9886\u5BFC\u60A8\u8FD9\u8BDD\u6211\u53EF\u4E0D\u6562\u63A5\uFF0C\u6211\u5148\u5E72\u4E3A\u656C\u300D\uFF0C\u4E00\u53E3\u559D\u5B8C", s: 90, r: "\u65E2\u7ED9\u4E86\u9886\u5BFC\u9762\u5B50\uFF0C\u53C8\u663E\u5F97\u61C2\u89C4\u77E9\uFF0C\u996D\u5C40\u4E0A\u6700\u7A33\u7684\u4E00\u624B\u3002" },
      { t: "\u63A8\u8F9E\u8BF4\u300C\u6211\u9152\u91CF\u771F\u4E0D\u884C\u300D", s: 50, r: "\u5076\u5C14\u4E00\u6B21\u53EF\u4EE5\uFF0C\u4F46\u656C\u9152\u65F6\u9A73\u9762\u5B50\u662F\u5927\u5FCC\uFF0C\u4E0B\u6B21\u4ED6\u672A\u5FC5\u518D\u656C\u4F60\u3002" },
      { t: "\u501F\u673A\u6C47\u62A5\u6700\u8FD1\u7684\u5DE5\u4F5C", s: 20, r: "\u996D\u5C40\u8C08\u516C\u4E8B\u662F\u573A\u5408\u5927\u5FCC\uFF0C\u9886\u5BFC\u4F1A\u89C9\u5F97\u4F60\u4E0D\u5206\u573A\u5408\u3002" }
    ],
    tip: "\u656C\u9152\u662F\u300C\u7ED9\u9762\u5B50\u300D\u7684\u827A\u672F\uFF1A\u8D77\u8EAB\u3001\u53CC\u624B\u3001\u5148\u5E72\u4E3A\u656C\uFF0C\u6BD4\u8BF4\u591A\u5C11\u8BDD\u90FD\u7BA1\u7528\u3002"
  },
  {
    id: "borrow",
    diff: "\u8FDB\u9636",
    tag: "\u91D1\u94B1\u5F80\u6765",
    title: "\u591A\u5E74\u4E0D\u8054\u7CFB\u7684\u8001\u540C\u5B66\u501F\u94B1",
    scene: "\u4E94\u5E74\u6CA1\u8054\u7CFB\u7684\u8001\u540C\u5B66\u963F\u5F3A\uFF0C\u6628\u665A\u7A81\u7136\u5FAE\u4FE1\u627E\u4F60\u501F 1 \u4E07\uFF1A\u300C\u8001\u54E5\u5468\u8F6C\u4E00\u4E0B\uFF0C\u4E0B\u6708\u51C6\u8FD8\u3002\u300D",
    choices: [
      { t: "\u4E8C\u8BDD\u4E0D\u8BF4\u76F4\u63A5\u8F6C", s: 30, r: "\u591A\u5E74\u4E0D\u8054\u7CFB\u4E00\u5F00\u53E3\u5C31\u662F\u94B1\uFF0C\u516B\u6210\u6709\u5751\uFF1B\u501F\u51FA\u53BB\u7684\u611F\u60C5\u5927\u6982\u7387\u8DDF\u7740\u94B1\u4E00\u8D77\u6CA1\u4E86\u3002" },
      { t: "\u5148\u95EE\u7528\u9014\u548C\u8FD8\u6B3E\u8BA1\u5212\uFF0C\u8BF4\u81EA\u5DF1\u4E5F\u4E0D\u5BBD\u88D5\uFF0C\u91CF\u529B\u501F\u4E00\u90E8\u5206\uFF0C\u8F6C\u8D26\u5907\u6CE8\u501F\u6B3E", s: 88, r: "\u987E\u4E86\u60C5\u9762\u4E5F\u4FDD\u62A4\u4E86\u81EA\u5DF1\uFF0C\u5907\u6CE8\u7559\u75D5\u6709\u636E\u53EF\u4F9D\uFF0C\u5BF9\u65B9\u4E5F\u660E\u767D\u4F60\u7684\u8FB9\u754C\u3002" },
      { t: "\u76F4\u63A5\u62C9\u9ED1", s: 35, r: "\u5173\u7CFB\u5F7B\u5E95\u65AD\u88C2\uFF0C\u4E07\u4E00\u5BF9\u65B9\u771F\u6709\u4E8B\uFF0C\u4F60\u5728\u5708\u5B50\u91CC\u4E5F\u843D\u4E2A\u300C\u4E0D\u8FD1\u4EBA\u60C5\u300D\u3002" },
      { t: "\u5047\u88C5\u6CA1\u770B\u89C1\uFF0C\u4E0D\u56DE\u590D", s: 45, r: "\u5BF9\u65B9\u5927\u6982\u7387\u77E5\u9053\u4F60\u5728\u88C5\uFF0C\u62D6\u5F97\u8D8A\u4E45\u8D8A\u8BB0\u6068\u4F60\u3002" }
    ],
    tip: "\u501F\u94B1\u770B\u4E09\u6837\uFF1A\u5173\u7CFB\u6DF1\u6D45\u3001\u7528\u9014\u771F\u5047\u3001\u8FD8\u6B3E\u80FD\u529B\u3002\u501F\u51FA\u53BB\u5C31\u5F53\u9001\uFF0C\u7559\u597D\u51ED\u8BC1\uFF1B\u4E0D\u501F\u5C31\u660E\u786E\u8BF4\u96BE\u5904\uFF0C\u522B\u73A9\u6D88\u5931\u3002"
  },
  {
    id: "marriage",
    diff: "\u8FDB\u9636",
    tag: "\u5BB6\u5EAD\u996D\u684C",
    title: "\u4EB2\u621A\u50AC\u5A5A\uFF0C\u600E\u4E48\u63A5\uFF1F",
    scene: "\u6625\u8282\u996D\u684C\u4E0A\uFF0C\u4E09\u59E8\u53C8\u5F00\u59CB\u4E86\uFF1A\u300C\u90FD 28 \u4E86\u8FD8\u4E0D\u627E\u5BF9\u8C61\uFF1F\u4F60\u5988\u5934\u53D1\u90FD\u6025\u767D\u4E86\uFF01\u300D",
    choices: [
      { t: "\u51B7\u8138\u603C\u56DE\u53BB\u300C\u5173\u60A8\u4EC0\u4E48\u4E8B\u300D", s: 20, r: "\u573A\u9762\u77AC\u95F4\u5C34\u5C2C\uFF0C\u957F\u8F88\u89C9\u5F97\u4F60\u4E0D\u61C2\u4E8B\uFF0C\u7238\u5988\u4E5F\u8DDF\u7740\u96BE\u505A\u3002" },
      { t: "\u7B11\u5475\u5475\u6253\u592A\u6781\uFF1A\u300C\u54CE\u5440\u6211\u4E5F\u6025\u5440\uFF0C\u7F18\u5206\u6CA1\u5230\u561B\u3002\u4E09\u59E8\uFF0C\u60A8\u5F53\u5E74\u662F\u600E\u4E48\u9047\u5230\u4E09\u59E8\u7236\u7684\uFF1F\u300D\u987A\u52BF\u628A\u8BDD\u9898\u629B\u56DE\u53BB", s: 92, r: "\u65E2\u6CA1\u7FFB\u8138\uFF0C\u53C8\u628A\u7126\u70B9\u8F6C\u79FB\u5230\u5BF9\u65B9\u8EAB\u4E0A\uFF0C\u957F\u8F88\u8FD8\u89C9\u5F97\u4F60\u60C5\u5546\u9AD8\u3002" },
      { t: "\u4F4E\u5934\u6252\u996D\u4E0D\u8BF4\u8BDD", s: 50, r: "\u4E0D\u56DE\u5E94\u4E5F\u7B97\u5F97\u4F53\uFF0C\u4F46\u5168\u7A0B\u95F7\u7740\u5BB9\u6613\u663E\u5F97\u8F74\u3002" },
      { t: "\u8BA4\u771F\u89E3\u91CA\u81EA\u5DF1\u4E3A\u4EC0\u4E48\u4E0D\u60F3\u7ED3\u5A5A", s: 40, r: "\u957F\u8F88\u4E0D\u662F\u6765\u542C\u7406\u7531\u7684\uFF0C\u4F60\u89E3\u91CA\u5F97\u8D8A\u8BA4\u771F\uFF0C\u8D8A\u5BB9\u6613\u5F15\u51FA\u4E00\u8FDE\u4E32\u8BF4\u6559\u3002" }
    ],
    tip: "\u50AC\u5A5A\u5E94\u5BF9\u7684\u6838\u5FC3\u662F\u300C\u4E0D\u63A5\u62DB\u300D\uFF1A\u7B11\u7740\u63A5\u8BDD\u3001\u8F6C\u79FB\u8BDD\u9898\u3001\u5938\u56DE\u5BF9\u65B9\uFF0C\u4E09\u62DB\u7528\u5B8C\u81EA\u7136\u7FFB\u7BC7\u3002"
  },
  {
    id: "gossip",
    diff: "\u8FDB\u9636",
    tag: "\u804C\u573A\u4EBA\u60C5",
    title: "\u540C\u4E8B\u5728\u4F60\u9762\u524D\u8BF4\u522B\u4EBA\u574F\u8BDD",
    scene: "\u8336\u6C34\u95F4\uFF0C\u540C\u4E8B\u5C0F\u7F8E\u51D1\u8FC7\u6765\uFF1A\u300C\u4F60\u4E0D\u89C9\u5F97\u8001\u5218\u7279\u522B\u4F1A\u62CD\u9A6C\u5C41\u5417\uFF1F\u5929\u5929\u5F80\u603B\u76D1\u529E\u516C\u5BA4\u8DD1\u3002\u300D",
    choices: [
      { t: "\u8DDF\u7740\u9644\u548C\u4E24\u53E5", s: 30, r: "\u8BDD\u4F20\u5230\u8001\u5218\u8033\u6735\u91CC\uFF0C\u4F60\u5C31\u6210\u4E86\u56BC\u820C\u6839\u7684\u540C\u4F19\uFF0C\u4E24\u4E2A\u4EBA\u90FD\u5F97\u7F6A\u3002" },
      { t: "\u7ACB\u523B\u53CD\u9A73\u300C\u4ED6\u4E0D\u662F\u90A3\u79CD\u4EBA\u300D", s: 45, r: "\u591F\u4E49\u6C14\uFF0C\u4F46\u5BB9\u6613\u628A\u573A\u9762\u641E\u50F5\uFF0C\u8FD8\u663E\u5F97\u4F60\u5728\u62A4\u77ED\u3002" },
      { t: "\u7B11\u7740\u5C94\u5F00\uFF1A\u300C\u5148\u4E0D\u8BF4\u8FD9\u4E2A\u3002\u8001\u5218\u5176\u5B9E\u633A\u9760\u8C31\uFF0C\u4E0A\u6B21\u8FD8\u5E2E\u6211\u9876\u4E86\u4E2A\u73ED\u3002\u300D\u8F7B\u63CF\u6DE1\u5199\u7ED9\u53F0\u9636", s: 90, r: "\u4E0D\u63A5\u574F\u8BDD\u3001\u987A\u624B\u8865\u4E00\u53E5\u597D\u8BDD\uFF0C\u65E2\u4FDD\u62A4\u4E86\u522B\u4EBA\uFF0C\u4E5F\u663E\u5F97\u4F60\u5927\u5EA6\u3002" },
      { t: "\u8F6C\u8EAB\u5C31\u53BB\u544A\u8BC9\u8001\u5218", s: 25, r: "\u4F20\u8BDD\u7684\u4EBA\u4F1A\u6068\u4F60\u5165\u9AA8\uFF0C\u4F60\u6210\u4E86\u6700\u5371\u9669\u7684\u5185\u5978\u3002" }
    ],
    tip: "\u542C\u5230\u574F\u8BDD\uFF0C\u6700\u9AD8\u6BB5\u4F4D\u662F\u300C\u4E0D\u63A5\u3001\u4E0D\u4F20\u3001\u8865\u4E00\u53E5\u597D\u8BDD\u300D\u3002\u5B81\u53EF\u5F53\u6CA1\u542C\u89C1\uFF0C\u4E5F\u522B\u5F53\u4F20\u58F0\u7B52\u3002"
  },
  {
    id: "paybill",
    diff: "\u5165\u95E8",
    tag: "\u996D\u5C40\u9152\u684C",
    title: "\u4F60\u7EC4\u7684\u5C40\uFF0C\u8C01\u4E70\u5355\uFF1F",
    scene: "\u4F60\u7EC4\u7684\u5C40\uFF0C\u53EB\u4E86\u4E24\u4E2A\u670B\u53CB\u5403\u706B\u9505\uFF0C\u7ED3\u8D26\u65F6\u670D\u52A1\u5458\u628A\u5355\u9012\u4E86\u8FC7\u6765\u3002",
    choices: [
      { t: "\u4F4E\u5934\u770B\u624B\u673A\uFF0C\u7B49\u522B\u4EBA\u63A5\u5355", s: 30, r: "\u4F60\u7EC4\u7684\u5C40\u4E0D\u4E70\u5355\uFF0C\u670B\u53CB\u5634\u4E0A\u4E0D\u8BF4\uFF0C\u5FC3\u91CC\u7ED9\u4F60\u8BB0\u4E00\u7B14\u3002" },
      { t: "\u4E3B\u52A8\u4E70\u5355\uFF1A\u300C\u4ECA\u5929\u662F\u6211\u7EC4\u7684\u5C40\uFF0C\u6211\u6765\uFF01\u4E0B\u6B21\u8F6E\u5230\u4F60\u4EEC\u3002\u300D", s: 92, r: "\u7EC4\u5C40\u4E70\u5355\u662F\u7EA6\u5B9A\u4FD7\u6210\uFF0C\u4E3B\u52A8\u4E00\u70B9\u663E\u5927\u6C14\uFF0C\u4E0B\u6B21\u522B\u4EBA\u81EA\u7136\u4F1A\u56DE\u8BF7\u3002" },
      { t: "\u5F53\u573A\u63D0\u8BAE AA", s: 55, r: "\u5E73\u8F88\u670B\u53CB\u4E4B\u95F4\u53EF\u4EE5\uFF0C\u4F46\u6709\u957F\u8F88\u6216\u9886\u5BFC\u5728\u573A\u7EDD\u5BF9\u4E0D\u884C\uFF0C\u4F1A\u663E\u5F97\u5C0F\u6C14\u3002" },
      { t: "\u501F\u53E3\u4E0A\u5395\u6240\u8EB2\u5355", s: 10, r: "\u4E00\u6B21\u8EB2\u5355\uFF0C\u5708\u5B50\u91CC\u4F20\u5F00\uFF0C\u4F60\u7684\u4EBA\u8BBE\u5C31\u5D29\u4E86\u3002" }
    ],
    tip: "\u4E70\u5355\u539F\u5219\uFF1A\u8C01\u7EC4\u5C40\u8C01\u4E70\uFF0C\u6216\u8F6E\u6D41\u5750\u5E84\u3002\u53EF\u4EE5\u62A2\u5355\uFF0C\u4F46\u522B\u8EB2\u5355\u3002"
  },
  {
    id: "weekend",
    diff: "\u9AD8\u624B",
    tag: "\u804C\u573A\u4EBA\u60C5",
    title: "\u9886\u5BFC\u5468\u4E94\u665A\u4E0A\u8BA9\u4F60\u5468\u672B\u52A0\u73ED",
    scene: "\u5468\u4E94\u665A\u4E0A 9 \u70B9\uFF0C\u9886\u5BFC\u53D1\u6D88\u606F\uFF1A\u300C\u5468\u516D\u90A3\u4E2A\u65B9\u6848\u8981\u6539\uFF0C\u4F60\u8F9B\u82E6\u4E00\u4E0B\u3002\u300D\u800C\u4F60\u660E\u5929\u5DF2\u6709\u5B89\u6392\u3002",
    choices: [
      { t: "\u79D2\u56DE\u300C\u9886\u5BFC\uFF0C\u6211\u660E\u5929\u6709\u4E8B\u6765\u4E0D\u4E86\u300D", s: 30, r: "\u76F4\u63A5\u62D2\u7EDD\u6700\u4F24\u5173\u7CFB\uFF0C\u9886\u5BFC\u53EA\u4F1A\u89C9\u5F97\u4F60\u4E0D\u625B\u4E8B\u3002" },
      { t: "\u5148\u63A5\u4F4F\u518D\u8C08\u6761\u4EF6\uFF1A\u300C\u9886\u5BFC\uFF0C\u5468\u516D\u4E0A\u5348\u6211\u6709\u4EF6\u91CD\u8981\u7684\u5BB6\u4E8B\uFF0C\u6211\u5148\u5728\u5BB6\u6539\u4E00\u7248\uFF0C\u4E0B\u5348\u7ED9\u60A8\u8FC7\u76EE\uFF0C\u53EF\u4EE5\u5417\uFF1F\u300D", s: 90, r: "\u5148\u63A5\u53D7\u518D\u8BB2\u56F0\u96BE\uFF0C\u65E2\u7ED9\u4E86\u9886\u5BFC\u53F0\u9636\uFF0C\u53C8\u5B88\u4F4F\u81EA\u5DF1\u7684\u5B89\u6392\uFF0C\u8FD8\u663E\u5F97\u9760\u8C31\u3002" },
      { t: "\u7B54\u5E94\u4E0B\u6765\uFF0C\u7136\u540E\u6D88\u6781\u6020\u5DE5", s: 35, r: "\u62D6\u5230\u5468\u65E5\u665A\u4E0A\u4EA4\uFF0C\u8D28\u91CF\u5DEE\u8FD8\u88AB\u8BB0\u4E00\u7B14\u300C\u4E0D\u4E3B\u52A8\u300D\u3002" },
      { t: "\u53D1\u670B\u53CB\u5708\u5410\u69FD", s: 10, r: "\u9886\u5BFC\u540C\u4E8B\u90FD\u770B\u5F97\u89C1\uFF0C\u60C5\u5546\u76F4\u63A5\u6E05\u96F6\u3002" }
    ],
    tip: "\u62D2\u7EDD\u7684\u827A\u672F\uFF1A\u5148\u63A5\u3001\u518D\u8C08\u3001\u7ED9\u66FF\u4EE3\u65B9\u6848\u3002\u8BA9\u9886\u5BFC\u89C9\u5F97\u4F60\u300C\u5C3D\u529B\u4E86\u300D\uFF0C\u6BD4\u4E89\u8BBA\u5BF9\u9519\u6709\u7528\u3002"
  },
  {
    id: "praise",
    diff: "\u5165\u95E8",
    tag: "\u804C\u573A\u4EBA\u60C5",
    title: "\u9886\u5BFC\u5F53\u4F17\u5938\u4F60\uFF0C\u600E\u4E48\u63A5\uFF1F",
    scene: "\u90E8\u95E8\u4F1A\u4E0A\uFF0C\u603B\u76D1\u5F53\u4F17\u5938\u4F60\uFF1A\u300C\u8FD9\u4E2A\u5B63\u5EA6\u5C31\u4F60\u9879\u76EE\u63A8\u8FDB\u5F97\u6700\u6F02\u4EAE\u3002\u300D",
    choices: [
      { t: "\u300C\u54EA\u91CC\u54EA\u91CC\uFF0C\u6211\u5DEE\u5F97\u8FDC\u300D", s: 70, r: "\u6807\u51C6\u8C26\u865A\uFF0C\u4E0D\u51FA\u9519\uFF0C\u4F46\u8FC7\u5EA6\u5426\u5B9A\u81EA\u5DF1\u7565\u663E\u5BA2\u5957\u3002" },
      { t: "\u300C\u8C22\u8C22\u603B\u76D1\uFF0C\u6211\u4E5F\u89C9\u5F97\u81EA\u5DF1\u633A\u68D2\u300D", s: 55, r: "\u592A\u5B9E\u5728\u4E86\uFF0C\u4E2D\u56FD\u4EBA\u8BED\u5883\u4E0B\u663E\u5F97\u4E0D\u8C26\u865A\u3002" },
      { t: "\u300C\u591A\u4E8F\u60A8\u5E73\u65F6\u628A\u5173\uFF0C\u6211\u8DDF\u60A8\u6BD4\u8FD8\u5DEE\u5F97\u8FDC\uFF0C\u8FD8\u5F97\u8DDF\u60A8\u591A\u5B66\u300D", s: 95, r: "\u8C26\u865A + \u56DE\u6367\u5BF9\u65B9\uFF0C\u6BB5\u4F4D\u6700\u9AD8\uFF0C\u5168\u573A\u90FD\u89C9\u5F97\u4F60\u4F1A\u6765\u4E8B\u3002" },
      { t: "\u5C34\u5C2C\u5730\u6446\u624B\u4E0D\u8BF4\u8BDD", s: 45, r: "\u767D\u767D\u6D6A\u8D39\u4E00\u6B21\u5728\u9886\u5BFC\u9762\u524D\u5C55\u793A\u7684\u673A\u4F1A\u3002" }
    ],
    tip: "\u88AB\u5938\u65F6\uFF1A\u5148\u8C22\uFF0C\u518D\u5F52\u529F\u4E8E\u5BF9\u65B9\u6216\u56E2\u961F\uFF0C\u6700\u540E\u8865\u4E00\u53E5\u300C\u8FD8\u5F97\u52AA\u529B\u300D\u3002\u4E09\u5206\u771F\u4E03\u5206\u8C26\u3002"
  },
  {
    id: "thanks",
    diff: "\u8FDB\u9636",
    tag: "\u793C\u5C1A\u5F80\u6765",
    title: "\u670B\u53CB\u5E2E\u4E86\u5927\u5FD9\uFF0C\u600E\u4E48\u8C22\uFF1F",
    scene: "\u4F60\u6258\u8001\u540C\u5B66\u5E2E\u4F60\u641E\u5B9A\u4E86\u4E00\u4E2A\u5F88\u96BE\u7684\u6E20\u9053\u8D44\u6E90\uFF0C\u5BF9\u65B9\u8DD1\u524D\u8DD1\u540E\u529E\u6210\u4E86\u3002",
    choices: [
      { t: "\u5FAE\u4FE1\u4E0A\u8FDE\u8BF4\u4E09\u53E5\u300C\u592A\u8C22\u8C22\u4E86\u300D", s: 40, r: "\u53E3\u5934\u8C22\u662F\u57FA\u7840\uFF0C\u4F46\u4E2D\u56FD\u5F0F\u4EBA\u60C5\u8BB2\u7A76\u300C\u5B9E\u9645\u8868\u793A\u300D\uFF0C\u7A7A\u53E3\u8C22\u4F1A\u88AB\u8BA4\u4E3A\u4E0D\u61C2\u4E8B\u3002" },
      { t: "\u53D1\u4E2A 88 \u7EA2\u5305", s: 55, r: "\u5FC3\u610F\u5230\u4E86\uFF0C\u4F46\u91D1\u989D\u96BE\u62FF\u634F\uFF0C\u50CF\u300C\u4EA4\u6613\u300D\uFF0C\u5BF9\u65B9\u672A\u5FC5\u613F\u610F\u6536\u3002" },
      { t: "\u8BF7\u5403\u4E00\u987F\u996D\uFF0C\u5E2D\u95F4\u8BF4\u300C\u8FD9\u6B21\u591A\u4E8F\u4F60\uFF0C\u4E0B\u6B21\u4F60\u6709\u4E8B\u5431\u4E00\u58F0\u300D\uFF0C\u4E4B\u540E\u4ED6\u9700\u8981\u65F6\u4E3B\u52A8\u5E2E\u56DE\u53BB", s: 92, r: "\u996D\u5C40\u662F\u4E2D\u56FD\u5F0F\u4EBA\u60C5\u6700\u597D\u7684\u8F7D\u4F53\uFF0C\u52A0\u4E0A\u300C\u4E0B\u6B21\u6211\u5E2E\u4F60\u300D\uFF0C\u4EBA\u60C5\u5C31\u6D41\u52A8\u8D77\u6765\u4E86\u3002" },
      { t: "\u8BB0\u5728\u5FC3\u91CC\uFF0C\u7B49\u4E0B\u6B21\u4ED6\u6C42\u4F60\u4F60\u518D\u8FD8", s: 45, r: "\u4EBA\u60C5\u62D6\u7740\u4E0D\u8FD8\uFF0C\u5BF9\u65B9\u5FC3\u91CC\u4F1A\u6709\u7599\u7629\uFF0C\u8FD8\u4EBA\u60C5\u8981\u8D81\u70ED\u3002" }
    ],
    tip: "\u4EBA\u60C5\u8981\u300C\u8D81\u70ED\u8FD8\u300D\uFF1A\u4E00\u987F\u996D\u3001\u4E00\u4EFD\u5FC3\u610F\u3001\u4E00\u6B21\u4E3B\u52A8\u5E2E\u5FD9\uFF0C\u90FD\u6BD4\u4E00\u53E5\u300C\u8C22\u8C22\u300D\u503C\u94B1\u3002"
  },
  {
    id: "gift",
    diff: "\u8FDB\u9636",
    tag: "\u793C\u5C1A\u5F80\u6765",
    title: "\u9001\u793C\u88AB\u62D2\uFF0C\u600E\u4E48\u529E\uFF1F",
    scene: "\u4F60\u63D0\u7740\u4E24\u76D2\u8336\u53F6\u53BB\u62DC\u8BBF\u4E00\u4F4D\u5E2E\u8FC7\u4F60\u7684\u524D\u8F88\uFF0C\u5BF9\u65B9\u6446\u624B\uFF1A\u300C\u5C0FX\u554A\uFF0C\u4F60\u8FD9\u662F\u5E72\u4EC0\u4E48\uFF0C\u62FF\u56DE\u53BB\u62FF\u56DE\u53BB\u3002\u300D",
    choices: [
      { t: "\u786C\u585E\uFF1A\u300C\u4E00\u70B9\u5C0F\u610F\u601D\uFF0C\u60A8\u52A1\u5FC5\u6536\u4E0B\u300D", s: 40, r: "\u9001\u793C\u88AB\u62D2\u8FD8\u786C\u63A8\uFF0C\u4F1A\u8BA9\u5BF9\u65B9\u8B66\u60D5\uFF0C\u53CD\u800C\u628A\u5173\u7CFB\u63A8\u8FDC\u3002" },
      { t: "\u987A\u52BF\u653E\u4E0B\uFF0C\u7B11\u7740\u8BF4\uFF1A\u300C\u524D\u8F88\u60A8\u522B\u8BEF\u4F1A\uFF0C\u5C31\u662F\u8001\u5BB6\u5E26\u7684\u571F\u7279\u4EA7\uFF0C\u5927\u5BB6\u5C1D\u5C1D\u9C9C\u300D\uFF0C\u8F6C\u8EAB\u81EA\u7136\u79BB\u5F00", s: 88, r: "\u628A\u300C\u793C\u300D\u964D\u7EA7\u6210\u300C\u5206\u4EAB\u300D\uFF0C\u964D\u4F4E\u5BF9\u65B9\u5FC3\u7406\u8D1F\u62C5\uFF0C\u65E2\u7ED9\u4E86\u5FC3\u610F\u53C8\u4E0D\u663E\u529F\u5229\u3002" },
      { t: "\u89C9\u5F97\u88AB\u9A73\u9762\u5B50\uFF0C\u8138\u8272\u4E00\u6C89\u8F6C\u8EAB\u5C31\u8D70", s: 25, r: "\u9001\u793C\u6C42\u7684\u662F\u5FC3\u610F\uFF0C\u8FD9\u70B9\u6C14\u5EA6\u90FD\u6CA1\u6709\uFF0C\u66F4\u663E\u5F97\u76EE\u7684\u6027\u5F3A\u3002" },
      { t: "\u56DE\u53BB\u53D1\u5FAE\u4FE1\u8FFD\u95EE\u300C\u90A3\u4E2A\u8336\u53F6\u6536\u5230\u4E86\u5417\u300D", s: 20, r: "\u9001\u793C\u6700\u5FCC\u8BB3\u95EE\u6536\u6CA1\u6536\u5230\uFF0C\u592A\u50CF\u4EA4\u6613\u3002" }
    ],
    tip: "\u9001\u793C\u5FC3\u6CD5\uFF1A\u300C\u8F7B\u63CF\u6DE1\u5199\u300D\u3002\u628A\u793C\u7269\u8BF4\u6210\u7279\u4EA7\u3001\u987A\u624B\u5E26\u7684\uFF0C\u5BF9\u65B9\u6CA1\u6709\u8D1F\u62C5\uFF0C\u4EBA\u60C5\u53CD\u800C\u8BB0\u4E0B\u4E86\u3002"
  },
  {
    id: "refuse",
    diff: "\u8FDB\u9636",
    tag: "\u804C\u573A\u4EBA\u60C5",
    title: "\u540C\u4E8B\u6C42\u4F60\u5E2E\u5FD9\uFF0C\u4F60\u4E0D\u60F3\u5E2E",
    scene: "\u540C\u4E8B\u5C0F\u7F8E\u5468\u4E94\u665A\u4E0A\u627E\u4F60\uFF1A\u300C\u6C42\u6C42\u4F60\u5E2E\u6211\u6539\u4E0B PPT\uFF0C\u6211\u5B9E\u5728\u641E\u4E0D\u5B9A\u4E86\uFF0C\u5468\u4E00\u5C31\u8981\u4EA4\u3002\u300D\u4F60\u81EA\u5DF1\u624B\u5934\u8FD8\u6709\u4E09\u4E2A\u65B9\u6848\u6CA1\u5199\u3002",
    choices: [
      { t: "\u786C\u7740\u5934\u76AE\u7B54\u5E94\uFF0C\u7136\u540E\u71AC\u591C\u8D76\u4E24\u4EFD\u6D3B", s: 40, r: "\u4F60\u5E2E\u4E86\u8FD9\u6B21\uFF0C\u4E0B\u6B21\u5979\u8FD8\u4F1A\u627E\u4F60\uFF1B\u81EA\u5DF1\u7684\u6D3B\u803D\u8BEF\u4E86\uFF0C\u4E24\u5934\u4E0D\u8BA8\u597D\u3002" },
      { t: "\u76F4\u63A5\u8BF4\u300C\u6211\u81EA\u5DF1\u7684\u6D3B\u90FD\u5E72\u4E0D\u5B8C\u300D", s: 35, r: "\u5B9E\u8BDD\u5B9E\u8BF4\u6CA1\u9519\uFF0C\u4F46\u8BED\u6C14\u592A\u786C\uFF0C\u540C\u4E8B\u5173\u7CFB\u5BB9\u6613\u7ED3\u7599\u7629\u3002" },
      { t: "\u59D4\u5A49\u62D2\u7EDD\u5E76\u7ED9\u66FF\u4EE3\u65B9\u6848\uFF1A\u300C\u6211\u8FD9\u4E24\u5929\u771F\u6392\u4E0D\u5F00\uFF0C\u4F60\u8981\u4E0D\u5148\u95EE\u95EE\u8001\u5218\uFF1F\u4ED6\u4E0A\u5468\u521A\u505A\u8FC7\u7C7B\u4F3C\u7684\u3002\u6211\u987A\u4FBF\u6559\u4F60\u4E2A\u6A21\u677F\uFF0C\u534A\u5C0F\u65F6\u80FD\u641E\u5B9A\u3002\u300D", s: 92, r: "\u62D2\u7EDD\u7ED9\u7406\u7531\u3001\u7ED9\u53F0\u9636\u3001\u7ED9\u66FF\u4EE3\u8DEF\u5F84\uFF0C\u5E2E\u4E86\u53C8\u4E0D\u5168\u5E2E\uFF0C\u6700\u5F97\u4F53\u3002" },
      { t: "\u8868\u9762\u7B54\u5E94\uFF0C\u62D6\u5230\u5468\u65E5\u624D\u8BF4\u300C\u54CE\u5440\u771F\u6CA1\u65F6\u95F4\u4E86\u300D", s: 20, r: "\u65E2\u5931\u4FE1\u53C8\u5F97\u7F6A\u4EBA\uFF0C\u6BD4\u4E00\u5F00\u59CB\u62D2\u7EDD\u8FD8\u4F24\u5173\u7CFB\u3002" }
    ],
    tip: "\u62D2\u7EDD\u7684\u516C\u5F0F\uFF1A\u63A5\u4F4F\u60C5\u7EEA \u2192 \u8BF4\u660E\u96BE\u5904 \u2192 \u7ED9\u66FF\u4EE3\u65B9\u6848\u3002\u8BA9\u4EBA\u77E5\u9053\u4F60\u5E2E\u4E0D\u4E86\uFF0C\u4F46\u613F\u610F\u60F3\u529E\u6CD5\u3002"
  },
  {
    id: "drink",
    diff: "\u8FDB\u9636",
    tag: "\u996D\u5C40\u9152\u684C",
    title: "\u88AB\u8D77\u54C4\u704C\u9152\uFF0C\u600E\u4E48\u529E\uFF1F",
    scene: "\u996D\u5C40\u8FDB\u884C\u5230\u4E00\u534A\uFF0C\u540C\u4E8B\u8D77\u54C4\uFF1A\u300C\u8001X\u4ECA\u5929\u9AD8\u5174\uFF0C\u518D\u6765\u4E09\u676F\uFF01\u300D\u4F60\u5DF2\u7ECF\u660E\u663E\u5230\u91CF\u4E86\uFF0C\u5934\u5F00\u59CB\u53D1\u6655\u3002",
    choices: [
      { t: "\u6765\u8005\u4E0D\u62D2\uFF0C\u786C\u559D\u4E09\u676F", s: 25, r: "\u9762\u5B50\u662F\u7ED9\u8DB3\u4E86\uFF0C\u4F46\u4E07\u4E00\u559D\u51FA\u4E8B\uFF0C\u53D7\u7F6A\u7684\u8FD8\u662F\u4F60\u81EA\u5DF1\uFF0C\u9886\u5BFC\u4E5F\u4F1A\u89C9\u5F97\u4F60\u4E0D\u77E5\u8282\u5236\u3002" },
      { t: "\u5F53\u573A\u7FFB\u8138\u300C\u8BF4\u4E86\u4E0D\u80FD\u559D\u5C31\u4E0D\u559D\u300D", s: 20, r: "\u684C\u4E0A\u6C14\u6C1B\u77AC\u95F4\u7ED3\u51B0\uFF0C\u6BD4\u5C11\u559D\u4E09\u676F\u66F4\u4F24\u611F\u60C5\u3002" },
      { t: "\u7B11\u7740\u63A5\u4F4F\uFF1A\u300C\u54E5\u51E0\u4E2A\u7ED9\u9762\u5B50\u6211\u61C2\uFF0C\u4F46\u4ECA\u665A\u771F\u5230\u91CF\u4E86\uFF0C\u6211\u4EE5\u8336\u4EE3\u9152\u656C\u5927\u5BB6\u4E00\u8F6E\uFF0C\u6539\u5929\u4E00\u5B9A\u8865\u4E0A\uFF01\u300D\u8D77\u8EAB\u656C\u4E00\u5708\u8336", s: 90, r: "\u65E2\u4E0D\u9A73\u9762\u5B50\uFF0C\u53C8\u5B88\u4F4F\u5E95\u7EBF\uFF0C\u8FD8\u663E\u5F97\u4F1A\u6765\u4E8B\u3002" },
      { t: "\u88C5\u9189\u8DB4\u684C\u4E0A", s: 45, r: "\u8EB2\u5F97\u4E86\u4E00\u65F6\uFF0C\u4E0B\u6B21\u5927\u5BB6\u66F4\u7231\u62FF\u4F60\u5F00\u73A9\u7B11\uFF0C\u8FD8\u53EF\u80FD\u843D\u4E0B\u300C\u88C5\u300D\u7684\u53E3\u7891\u3002" }
    ],
    tip: "\u6321\u9152\u7684\u8981\u70B9\uFF1A\u628A\u300C\u4E0D\u80FD\u559D\u300D\u5305\u88C5\u6210\u300C\u6539\u5929\u8865\u4E0A\u300D+ \u5F53\u573A\u4EE5\u8336\u4EE3\u9152\u656C\u56DE\u53BB\u3002\u9762\u5B50\u7ED9\u8DB3\uFF0C\u91CF\u81EA\u5DF1\u5B88\u3002"
  },
  {
    id: "blinddate",
    diff: "\u9AD8\u624B",
    tag: "\u5BB6\u5EAD\u996D\u684C",
    title: "\u76F8\u4EB2\u5BF9\u8C61\u52A0\u4E86\u5FAE\u4FE1\uFF0C\u600E\u4E48\u5F00\u573A\uFF1F",
    scene: "\u957F\u8F88\u7ED9\u4F60\u4ECB\u7ECD\u4E86\u4E2A\u5BF9\u8C61\uFF0C\u5FAE\u4FE1\u901A\u8FC7\u4E86\uFF0C\u5BF9\u9762\u53D1\u6765\u4E00\u53E5\uFF1A\u300C\u4F60\u597D\uFF0C\u6211\u662F\u738B\u59E8\u4ECB\u7ECD\u7684\u3002\u300D",
    choices: [
      { t: "\u56DE\u300C\u55EF\uFF0C\u4F60\u597D\u3002\u300D\u7136\u540E\u6CA1\u4E86\u4E0B\u6587", s: 35, r: "\u4E00\u53E5\u8BDD\u628A\u5929\u804A\u6B7B\uFF0C\u957F\u8F88\u90A3\u8FB9\u4E5F\u4E0D\u597D\u4EA4\u4EE3\u3002" },
      { t: "\u79D2\u56DE\u4E00\u5927\u6BB5\u81EA\u6211\u4ECB\u7ECD\u548C\u5BB6\u5EAD\u60C5\u51B5", s: 40, r: "\u592A\u7528\u529B\uFF0C\u50CF\u67E5\u6237\u53E3\uFF0C\u5BF9\u65B9\u538B\u529B\u5F88\u5927\u3002" },
      { t: "\u8F7B\u677E\u63A5\u4F4F\uFF1A\u300C\u4F60\u597D\u4F60\u597D\uFF0C\u738B\u59E8\u8DDF\u6211\u5FF5\u53E8\u4F60\u597D\u51E0\u6B21\u4E86\uFF0C\u8BF4\u4F60\u4EBA\u7279\u522B\u597D\u3002\u5979\u8FD9\u4ECB\u7ECD\u4EBA\u5F53\u5F97\u6BD4\u6211\u4EEC\u4FE9\u90FD\u79EF\u6781\u3002\u300D\u987A\u52BF\u629B\u4E2A\u8BDD\u9898", s: 90, r: "\u5F00\u573A\u81EA\u7136\u3001\u5E7D\u9ED8\u3001\u7ED9\u53CC\u65B9\u53F0\u9636\uFF0C\u8FD8\u987A\u52BF\u628A\u8BDD\u9898\u9012\u4E86\u56DE\u53BB\u3002" },
      { t: "\u76F4\u63A5\u95EE\u300C\u4F60\u5DE5\u8D44\u591A\u5C11\uFF1F\u6709\u623F\u5417\uFF1F\u300D", s: 10, r: "\u76F8\u4EB2\u5927\u5FCC\uFF0C\u4E00\u6B21\u5C31\u628A\u4EBA\u5413\u8DD1\u3002" }
    ],
    tip: "\u76F8\u4EB2\u5F00\u573A\u4E09\u4E0D\u8981\uFF1A\u522B\u67E5\u6237\u53E3\u3001\u522B\u5C2C\u804A\u3001\u522B\u8FC7\u5EA6\u70ED\u60C5\u3002\u8F7B\u677E\u63A5\u8BDD + \u987A\u52BF\u629B\u8BDD\u9898\uFF0C\u8BA9\u5BF9\u65B9\u6709\u8BDD\u53EF\u63A5\u3002"
  },
  {
    id: "saveface",
    diff: "\u9AD8\u624B",
    tag: "\u804C\u573A\u4EBA\u60C5",
    title: "\u996D\u5C40\u51B7\u573A\uFF0C\u600E\u4E48\u6551\uFF1F",
    scene: "\u996D\u5C40\u4E0A\uFF0C\u540C\u4E8B\u559D\u591A\u4E86\u8BF4\u79C3\u565C\u5634\uFF1A\u300C\u54B1\u4EEC\u603B\u76D1\u90A3\u70B9\u6C34\u5E73\uFF0C\u8FD8\u4E0D\u5982\u6211\u3002\u300D\u5168\u573A\u77AC\u95F4\u5B89\u9759\uFF0C\u6240\u6709\u4EBA\u7684\u76EE\u5149\u90FD\u770B\u5411\u4F60\u3002",
    choices: [
      { t: "\u8DDF\u7740\u8D77\u54C4\u300C\u5C31\u662F\u5C31\u662F\u300D", s: 20, r: "\u8BDD\u4F20\u5230\u603B\u76D1\u8033\u6735\u91CC\uFF0C\u4F60\u4FE9\u90FD\u5F97\u5B8C\u86CB\u3002" },
      { t: "\u5047\u88C5\u6CA1\u542C\u89C1\uFF0C\u4F4E\u5934\u5403\u83DC", s: 50, r: "\u4E0D\u63A5\u662F\u6700\u597D\u7684\u6B62\u635F\uFF0C\u4F46\u6C14\u6C1B\u8FD8\u662F\u5C34\u5C2C\uFF0C\u53EF\u4EE5\u66F4\u4E3B\u52A8\u4E00\u70B9\u3002" },
      { t: "\u7B11\u7740\u4E00\u676F\u9152\u5E26\u8FC7\u53BB\uFF1A\u300C\u54E5\u559D\u591A\u4E86\u8BF4\u80E1\u8BDD\uFF0C\u6211\u66FF\u4ED6\u7F5A\u4E00\u676F\uFF01\u603B\u76D1\u5E73\u65F6\u5BF9\u54B1\u4EEC\u662F\u771F\u4E0A\u5FC3\uFF0C\u4E0A\u56DE\u6211\u90A3\u4E2A\u9879\u76EE\u5168\u9760\u4ED6\u628A\u5173\u3002\u300D", s: 92, r: "\u65E2\u515C\u4F4F\u4E86\u540C\u4E8B\u7684\u9189\u8BDD\uFF0C\u53C8\u987A\u5E26\u5938\u4E86\u603B\u76D1\uFF0C\u4E00\u77F3\u4E8C\u9E1F\u3002" },
      { t: "\u5F53\u573A\u7EA0\u6B63\u4ED6\u300C\u4F60\u8BF4\u4EC0\u4E48\u5462\u300D", s: 45, r: "\u867D\u7136\u5360\u7406\uFF0C\u4F46\u9152\u684C\u4E0A\u8F83\u771F\u53EA\u4F1A\u8BA9\u573A\u9762\u66F4\u96BE\u770B\u3002" }
    ],
    tip: "\u6551\u573A = \u515C\u8BDD + \u8F6C\u79FB + \u8865\u597D\u8BDD\u3002\u522B\u4EBA\u8BF4\u9519\u8BDD\u65F6\uFF0C\u5E2E\u4ED6\u5706\u56DE\u6765\u5C31\u662F\u7ED9\u5168\u684C\u7559\u9762\u5B50\uFF0C\u5927\u5BB6\u90FD\u4F1A\u8BB0\u4F60\u7684\u60C5\u3002"
  },
  {
    id: "redpacket",
    diff: "\u5165\u95E8",
    tag: "\u793C\u5C1A\u5F80\u6765",
    title: "\u7FA4\u91CC\u7EA2\u5305\u4F60\u624B\u6C14\u6700\u4F73\uFF0C\u600E\u4E48\u8868\u6001\uFF1F",
    scene: "\u90E8\u95E8\u7FA4\u91CC\uFF0C\u9886\u5BFC\u53D1\u4E86\u4E2A\u7EA2\u5305\uFF0C\u4F60\u62A2\u5230\u4E86 88 \u5757\uFF0C\u7FA4\u91CC\u5237\u4E86\u4E00\u5806\u300C\u8C22\u8C22\u8001\u677F\u300D\u7684\u8868\u60C5\u5305\u3002",
    choices: [
      { t: "\u9ED8\u9ED8\u6536\u4E0B\uFF0C\u4E00\u53E5\u8BDD\u4E0D\u8BF4", s: 45, r: "\u4E0D\u542D\u58F0\u663E\u5F97\u4E0D\u61C2\u793C\uFF0C\u4E0B\u56DE\u9886\u5BFC\u53EF\u80FD\u5C31\u4E0D\u53D1\u4E86\u3002" },
      { t: "\u7ACB\u523B\u53D1\u4E00\u53E5\u300C\u8C22\u8C22\u8001\u677F\uFF01\u300D", s: 70, r: "\u57FA\u672C\u793C\u4EEA\u5230\u4F4D\uFF0C\u4F46\u53EF\u4EE5\u66F4\u597D\u3002" },
      { t: "\u56DE\u4E00\u53E5\u300C\u8C22\u8C22\u8001\u677F\uFF01\u8001\u677F\u53D1\u8D22\uFF01\u300D\u518D\u8F6C\u624B\u5728\u7FA4\u91CC\u53D1\u4E00\u4E2A 66 \u7684\u7EA2\u5305\uFF0C\u8BF4\u300C\u6CBE\u6CBE\u559C\u6C14\uFF0C\u7ED9\u5927\u5BB6\u5206\u5206\u300D", s: 90, r: "\u6536\u4E86\u518D\u6563\u51FA\u53BB\uFF0C\u65E2\u70ED\u95F9\u4E86\u6C14\u6C1B\uFF0C\u53C8\u8BA9\u9886\u5BFC\u89C9\u5F97\u4F60\u4F1A\u505A\u4EBA\u3002" },
      { t: "\u8FFD\u7740\u8BF4\u300C\u8001\u677F\u518D\u53D1\u4E00\u4E2A\u300D", s: 30, r: "\u6CA1\u5206\u5BF8\uFF0C\u4E00\u6B21\u5C31\u8D25\u597D\u611F\u3002" }
    ],
    tip: "\u7EA2\u5305\u793C\u4EEA\uFF1A\u9886\u4E86\u8981\u8868\u6001\uFF1B\u624B\u6C14\u6700\u4F73\u65F6\u300C\u6536\u4E86\u518D\u6563\u300D\u662F\u6700\u9AD8\u6BB5\u4F4D\u2014\u2014\u70ED\u95F9\u4E86\u7FA4\uFF0C\u8FD8\u4E86\u60C5\uFF0C\u8C01\u4E5F\u4E0D\u6B20\u3002"
  }
];
var SCHEMA_VERSION = 5;
var DB_KEY = "eqworker_db_v1";
var LEGACY_DB_KEYS = ["rqsg_radar_v2"];
var AI_KEY = "eqworker_ai_key_v1";
var DEFAULT_AI = {
  enabled: false,
  providerId: "",
  model: "",
  baseUrl: "",
  temperature: 0.7
};
var DEFAULT_SETTINGS = {
  giftTier: "standard",
  cityTier: "\u4E8C\u7EBF",
  ai: { ...DEFAULT_AI }
};

// packages/core/src/date.ts
var DAY = 864e5;
var LUNAR_INFO = [
  19416,
  19168,
  42352,
  21717,
  53856,
  55632,
  91476,
  22176,
  39632,
  21970,
  19168,
  42422,
  42192,
  53840,
  119381,
  46400,
  54944,
  44450,
  38320,
  84343,
  18800,
  42160,
  46261,
  27216,
  27968,
  109396,
  11104,
  38256,
  21234,
  18800,
  25958,
  54432,
  59984,
  28309,
  23248,
  11104,
  100067,
  37600,
  116951,
  51536,
  54432,
  120998,
  46416,
  22176,
  107956,
  9680,
  37584,
  53938,
  43344,
  46423,
  27808,
  46416,
  86869,
  19872,
  42416,
  83315,
  21168,
  43432,
  59728,
  27296,
  44710,
  43856,
  19296,
  43748,
  42352,
  21088,
  62051,
  55632,
  23383,
  22176,
  38608,
  19925,
  19152,
  42192,
  54484,
  53840,
  54616,
  46400,
  46752,
  103846,
  38320,
  18864,
  43380,
  42160,
  45690,
  27216,
  27968,
  44870,
  43872,
  38256,
  19189,
  18800,
  25776,
  29859,
  59984,
  27480,
  23232,
  43872,
  38613,
  37600,
  51552,
  55636,
  54432,
  55888,
  30034,
  22176,
  43959,
  9680,
  37584,
  51893,
  43344,
  46240,
  47780,
  44368,
  21977,
  19360,
  42416,
  86390,
  21168,
  43312,
  31060,
  27296,
  44368,
  23378,
  19296,
  42726,
  42208,
  53856,
  60005,
  54576,
  23200,
  30371,
  38608,
  19195,
  19152,
  42192,
  118966,
  53840,
  54560,
  56645,
  46496,
  22224,
  21938,
  18864,
  42359,
  42160,
  43600,
  111189,
  27936,
  44448,
  84835,
  37744,
  18936,
  18800,
  25776,
  92326,
  59984,
  27424,
  108228,
  43744,
  37600,
  53987,
  51552,
  54615,
  54432,
  55888,
  23893,
  22176,
  42704,
  21972,
  21200,
  43448,
  43344,
  46240,
  46758,
  44368,
  21920,
  43940,
  42416,
  21168,
  45683,
  26928,
  29495,
  27296,
  44368,
  84821,
  19296,
  42352,
  21732,
  53600,
  59752,
  54560,
  55968,
  92838,
  22224,
  19168,
  43476,
  42192,
  53584,
  62034,
  54560
];
function lYearDays(y) {
  let s = 348;
  for (let i = 32768; i > 8; i >>= 1) s += LUNAR_INFO[y - 1900] & i ? 1 : 0;
  return s + lLeapDays(y);
}
function lLeapMonth(y) {
  return LUNAR_INFO[y - 1900] & 15;
}
function lLeapDays(y) {
  return lLeapMonth(y) ? LUNAR_INFO[y - 1900] & 65536 ? 30 : 29 : 0;
}
function lMonthDays(y, m) {
  return LUNAR_INFO[y - 1900] & 65536 >> m ? 30 : 29;
}
function solarToLunar(d) {
  const base = Date.UTC(1900, 0, 31);
  let off = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - base) / DAY);
  let y = 1900;
  while (off >= 0) {
    const yD = lYearDays(y);
    if (off < yD) break;
    off -= yD;
    y++;
  }
  const leap = lLeapMonth(y);
  let isLeap = false;
  let m = 1;
  while (m <= 12) {
    const mD = leap === m && isLeap ? lLeapDays(y) : lMonthDays(y, m);
    if (off < mD) break;
    off -= mD;
    if (leap === m && !isLeap) {
      isLeap = true;
    } else {
      m++;
      isLeap = false;
    }
  }
  return { y, m, d: off + 1, leap: isLeap };
}
var FESTIVALS = [
  { m: 1, d: 1, n: "\u6625\u8282" },
  { m: 5, d: 5, n: "\u7AEF\u5348\u8282" },
  { m: 8, d: 15, n: "\u4E2D\u79CB\u8282" }
];
function upcomingFestival(now = Date.now()) {
  const base = new Date(now);
  for (let i = 0; i <= 7; i++) {
    const lu = solarToLunar(new Date(base.getTime() + i * DAY));
    for (const f of FESTIVALS) if (lu.m === f.m && lu.d === f.d) return { n: f.n, days: i };
  }
  return null;
}
function fmtDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function todayStr(now = Date.now()) {
  return fmtDate(now);
}
function toMMDD(v) {
  if (!v) return "";
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? m[2] + "-" + m[3] : String(v);
}
function toDateInput(v, now = Date.now()) {
  if (!v) return "";
  const m = String(v).match(/^(\d{2})-(\d{2})$/);
  if (!m) return String(v);
  const y = new Date(now).getFullYear();
  const d = new Date(y, +m[1] - 1, +m[2]);
  if (d.getMonth() !== +m[1] - 1) return y + "-02-28";
  return y + "-" + m[1] + "-" + m[2];
}
function daysUntil(birthday, now = Date.now()) {
  const bd = toMMDD(birthday);
  const ref = new Date(now);
  const [m, d] = bd.split("-").map(Number);
  if (!m || !d) return 1e9;
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  let t = new Date(ref.getFullYear(), m - 1, d);
  if (t.getMonth() !== m - 1) t = new Date(ref.getFullYear(), m - 1, 28);
  if (t.getTime() < today.getTime()) {
    t = new Date(ref.getFullYear() + 1, m - 1, d);
    if (t.getMonth() !== m - 1) t = new Date(ref.getFullYear() + 1, m - 1, 28);
  }
  return Math.round((t.getTime() - today.getTime()) / DAY);
}
function nextMMDD(mmdd2, from = Date.now()) {
  const [m, d] = String(mmdd2 || "").split("-").map(Number);
  if (!m || !d) return null;
  const base = new Date(from);
  const today = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  let t = new Date(base.getFullYear(), m - 1, d);
  if (t.getMonth() !== m - 1) t = new Date(base.getFullYear(), m - 1, 28);
  if (t.getTime() < today.getTime()) {
    t = new Date(base.getFullYear() + 1, m - 1, d);
    if (t.getMonth() !== m - 1) t = new Date(base.getFullYear() + 1, m - 1, 28);
  }
  return t;
}

// packages/core/src/sanitize.ts
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
function esc(s) {
  return String(s == null ? "" : s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}
function isObj(x) {
  return !!x && typeof x === "object" && !Array.isArray(x);
}
function num(x, def) {
  return typeof x === "number" && isFinite(x) ? x : def;
}
function str(x, max) {
  return typeof x === "string" ? x.slice(0, max) : "";
}
function mmdd(x) {
  const s = str(x, 10);
  const m = s.match(/^(?:\d{4}-)?(\d{2})-(\d{2})$/);
  return m ? m[1] + "-" + m[2] : "";
}
function fixWeight(type, w) {
  const t = EVENT_TYPES[type] || EVENT_TYPES.other;
  let n = num(w, t.dHeat);
  if (t.dHeat < 0 && n > 0) n = -n;
  return n;
}
function fixDir(type, dir, amount) {
  if (!(amount > 0)) return "none";
  if (dir === "in" || dir === "out") return dir;
  if (type === "gift_get") return "in";
  if (type === "gift_give") return "out";
  if (type === "money") return "in";
  return "none";
}
function normalizeSettings(raw) {
  const r = isObj(raw) ? raw : {};
  const aiRaw = isObj(r.ai) ? r.ai : {};
  const giftTier = ["simple", "standard", "generous"].includes(r.giftTier) ? r.giftTier : DEFAULT_SETTINGS.giftTier;
  const cityTier = ["\u4E09\u7EBF", "\u4E8C\u7EBF", "\u4E00\u7EBF"].includes(r.cityTier) ? r.cityTier : DEFAULT_SETTINGS.cityTier;
  const temperature = num(aiRaw.temperature, DEFAULT_SETTINGS.ai.temperature);
  return {
    giftTier,
    cityTier,
    ai: {
      enabled: aiRaw.enabled === true,
      providerId: str(aiRaw.providerId, 40),
      model: str(aiRaw.model, 80),
      baseUrl: str(aiRaw.baseUrl, 300),
      temperature: clamp(temperature, 0, 2)
    }
  };
}
function createEmptyState() {
  return {
    persons: [],
    events: [],
    reminders: [],
    progress: {},
    streak: { n: 0, last: "" },
    settings: normalizeSettings(null),
    meta: { schema: SCHEMA_VERSION, updatedAt: Date.now() },
    lastEventId: null,
    filter: "",
    identity: "all",
    sortBy: "heat",
    trainDiff: "\u5168\u90E8",
    ledgerFilter: "all"
  };
}
function sanitizeImport(d) {
  const warn = [];
  let rawPersons = Array.isArray(d.persons) ? d.persons : [];
  const nP = rawPersons.length;
  const persons = rawPersons.filter((p) => isObj(p) && typeof p.name === "string" && !!p.name.trim()).map((p) => ({
    id: typeof p.id === "string" && p.id ? p.id : uid(),
    name: str(p.name, 60),
    identity: str(p.identity, 40),
    tags: Array.isArray(p.tags) ? p.tags.filter((t) => typeof t === "string").map((t) => t.slice(0, 20)).slice(0, 10) : [],
    birthday: mmdd(p.birthday),
    anniversary: mmdd(p.anniversary),
    likes: str(p.likes, 200),
    taboos: str(p.taboos, 200),
    note: str(p.note, 500),
    adjust: num(p.adjust, 0),
    createdAt: num(p.createdAt, Date.now())
  }));
  if (nP !== persons.length) warn.push("\u4EBA\u8109 " + (nP - persons.length) + " \u6761");
  const rawEvents = Array.isArray(d.events) ? d.events : [];
  const nE = rawEvents.length;
  const events = rawEvents.filter((e) => isObj(e) && typeof e.type === "string" && num(e.time, 0) > 0).map((e) => {
    const amount = clamp(num(e.amount, 0), 0, 1e7);
    const type = e.type;
    return {
      id: typeof e.id === "string" && e.id ? e.id : uid(),
      personId: str(e.personId, 40),
      type,
      title: str(e.title, 80),
      time: num(e.time, Date.now()),
      weight: fixWeight(type, e.weight),
      note: str(e.note, 500),
      amount,
      dir: fixDir(type, e.dir, amount),
      occasion: str(e.occasion, 20)
    };
  });
  if (nE !== events.length) warn.push("\u5F80\u6765 " + (nE - events.length) + " \u6761");
  const reminders = Array.isArray(d.reminders) ? d.reminders.filter(isObj).map((r) => ({
    id: typeof r.id === "string" && r.id ? r.id : uid(),
    personId: str(r.personId, 40),
    content: str(r.content, 200),
    date: str(r.date, 20),
    status: r.status === "done" ? "done" : "pending"
  })) : [];
  const rawProg = isObj(d.progress) ? d.progress : {};
  const progress = {};
  for (const k of Object.keys(rawProg)) {
    const v = rawProg[k];
    if (isObj(v)) progress[k] = { best: num(v.best, 0), times: num(v.times, 0) };
  }
  const st = isObj(d.streak) ? d.streak : {};
  const streak = { n: num(st.n, 0), last: str(st.last, 20) };
  return {
    persons,
    events,
    reminders,
    progress,
    streak,
    settings: normalizeSettings(d.settings),
    warn,
    schemaMismatch: typeof d.schema === "number" && d.schema !== SCHEMA_VERSION
  };
}

// packages/core/src/engine.ts
var PLACEHOLDER = {
  help_them: "\u5BF9\u65B9\u5E2E\u6211\u534F\u8C03\u4E86\u8D44\u6E90",
  help_me: "\u5E2E\u5BF9\u65B9\u642C\u4E86\u5BB6",
  meal: "\u5468\u4E94\u665A\u4E0A\u4E00\u8D77\u5403\u4E86\u987F\u706B\u9505",
  gift_get: "\u6536\u5230\u4E86\u4E2D\u79CB\u793C\u76D2",
  gift_give: "\u7ED9\u5BF9\u65B9\u9001\u4E86\u751F\u65E5\u793C\u7269",
  money: "\u501F\u4E865000\uFF0C\u8BF4\u597D\u4E0B\u6708\u8FD8",
  talk: "\u6DF1\u591C\u804A\u4E86\u804A\u8FD1\u51B5\u548C\u6253\u7B97",
  greeting: "\u6625\u8282\u53D1\u4E86\u795D\u798F",
  conflict: "\u56E0\u4E3A\u9879\u76EE\u5206\u5DE5\u8D77\u4E86\u4E89\u6267",
  other: "\u5468\u672B\u4E00\u8D77\u901B\u4E86\u8D9F\u8857"
};
var PLACEHOLDERS = PLACEHOLDER;
function computePerson(state, p, now = Date.now()) {
  const evs = state.events.filter((e) => e.personId === p.id);
  let heat = 50;
  let trust = 40;
  let intim = 35;
  let debt = 0;
  let lastTs = null;
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
function computedFor(state, personId, now = Date.now()) {
  const p = state.persons.find((x) => x.id === personId);
  return p ? computePerson(state, p, now) : null;
}
function wisdomFull() {
  return SCENARIOS.reduce((sum, sc) => sum + 100 * DIFFS[sc.diff].w, 0);
}
function getWisdom(state) {
  let s = 0;
  for (const k in state.progress) {
    const sc = SCENARIOS.find((x) => x.id === k);
    const w = DIFFS[sc ? sc.diff : "\u5165\u95E8"].w;
    s += state.progress[k].best * w;
  }
  const full = wisdomFull();
  if (!(full > 0)) return 0;
  return clamp(Math.round(s / full * 100), 0, 100);
}
function getLevel(w) {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (w >= l.min) cur = l;
  const nxt = LEVELS.find((l) => l.min > cur.min);
  return { cur, nxt, pct: nxt ? Math.round((w - cur.min) / (nxt.min - cur.min) * 100) : 100 };
}
function overallMetrics(state, now = Date.now()) {
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
function buildAlerts(state, now = Date.now()) {
  const out = [];
  const fst = upcomingFestival(now);
  if (fst) {
    out.push({
      ic: "fest",
      cls: "blue",
      personId: "",
      text: `${fst.days === 0 ? "\u4ECA\u5929\u662F" : fst.days + " \u5929\u540E\u662F"}${fst.n}\uFF0C\u8BB0\u5F97\u7ED9\u91CD\u8981\u7684\u4EBA\u9001\u4E2A\u795D\u798F\u3001\u8D70\u52A8\u4E00\u4E0B`
    });
  }
  for (const p of state.persons) {
    const m = computePerson(state, p, now);
    if (m.debt >= 20) {
      out.push({
        ic: "debt",
        cls: "amber",
        personId: p.id,
        text: `<b>${esc(p.name)}</b>\uFF1A\u4F60\u6B20\u7740\u4EBA\u60C5\u503A\uFF08${Math.round(m.debt)}\uFF09\uFF0C\u5EFA\u8BAE\u8FD1\u671F\u8BF7\u987F\u996D\u6216\u56DE\u4E2A\u793C`
      });
    }
    if (m.lastDays !== null && m.lastDays >= 60) {
      out.push({
        ic: "stale",
        cls: "red",
        personId: p.id,
        text: `<b>${esc(p.name)}</b>\uFF1A\u5DF2 ${m.lastDays} \u5929\u6CA1\u5F80\u6765\uFF0C\u9022\u5E74\u8FC7\u8282\u8D70\u52A8\u4E00\u4E0B`
      });
    }
    if (p.birthday) {
      const d = daysUntil(p.birthday, now);
      if (d >= 0 && d <= 7) {
        out.push({
          ic: "bday",
          cls: "teal",
          personId: p.id,
          text: `<b>${esc(p.name)}</b>\uFF1A\u751F\u65E5${d === 0 ? "\u5C31\u662F\u4ECA\u5929" : `\u8FD8\u6709 ${d} \u5929`}\uFF0C\u8BB0\u5F97\u9001\u4E0A\u795D\u798F`
        });
      }
    }
  }
  for (const r of state.reminders) {
    if (r.status === "pending" && (!r.date || r.date <= todayStr(now))) {
      out.push({
        ic: "todo",
        cls: "blue",
        personId: r.personId,
        text: `\u5F85\u529E\uFF1A${esc(r.content)}`,
        reminderId: r.id
      });
    }
  }
  const PRIO = { red: 0, amber: 1, teal: 2, blue: 3 };
  out.sort((a, b) => PRIO[a.cls] - PRIO[b.cls]);
  return out.slice(0, 8);
}
function getSuggestion(state, p, now = Date.now()) {
  const m = computePerson(state, p, now);
  if (m.debt >= 20) return "\u4EBA\u60C5\u8981\u8D81\u70ED\u8FD8\uFF1A\u627E\u4E2A\u7531\u5934\u7EA6\u987F\u996D\uFF0C\u5F00\u573A\u63D0\u4E00\u53E5\u300C\u4E0A\u6B21\u90A3\u4E8B\u591A\u4E8F\u4F60\u300D\uFF0C\u987A\u624B\u5E26\u70B9\u5C0F\u7279\u4EA7\uFF0C\u628A\u503A\u4E86\u4E86\u3002";
  if (m.lastDays !== null && m.lastDays >= 60) return "\u522B\u786C\u627E\u8BDD\u9898\uFF1A\u4EE5\u95EE\u5019\u7834\u51B0\u6700\u81EA\u7136\u2014\u2014\u300C\u6700\u8FD1\u5FD9\u5565\u5462\uFF0C\u597D\u4E45\u6CA1\u805A\u4E86\u300D\uFF0C\u987A\u52BF\u7EA6\u4E2A\u996D\u6216\u559D\u676F\u8336\u3002";
  if (m.intimacy >= 70) return "\u5173\u7CFB\u6B63\u70ED\uFF0C\u503C\u5F97\u6DF1\u5316\uFF1A\u7EA6\u4E2A\u7403\u5C40\u6216\u4E0B\u5348\u8336\uFF0C\u804A\u70B9\u5DE5\u4F5C\u4E4B\u5916\u7684\u4E8B\uFF0C\u8BA9\u4EA4\u60C5\u4ECE\u300C\u6709\u4E8B\u624D\u8054\u7CFB\u300D\u53D8\u6210\u300C\u6CA1\u4E8B\u4E5F\u8054\u7CFB\u300D\u3002";
  if (m.lastDays === null) return "\u521A\u8BA4\u8BC6\uFF0C\u522B\u6025\u7740\u4F7F\u52B2\uFF1A\u9022\u5E74\u8FC7\u8282\u4E00\u53E5\u95EE\u5019\u3001\u5076\u5C14\u70B9\u8D5E\u4E92\u52A8\uFF0C\u5148\u81EA\u7136\u719F\u7EDC\uFF0C\u518D\u627E\u673A\u4F1A\u6DF1\u4EA4\u3002";
  return "\u4FDD\u6301\u8282\u594F\uFF1A\u9694\u4E00\u4E24\u5468\u4E00\u53E5\u95EE\u5019\u5373\u53EF\uFF0C\u4E0D\u7528\u523B\u610F\u3002\u5173\u7CFB\u662F\u7EC6\u6C34\u957F\u6D41\uFF0C\u4E0D\u662F\u7A81\u51FB\u4EFB\u52A1\u3002";
}
function relationRead(state, p, now = Date.now()) {
  const m = computePerson(state, p, now);
  const seg = [];
  if (m.lastDays === null) seg.push("\u521A\u8BB0\u8FDB\u6765\uFF0C\u8FD8\u6CA1\u600E\u4E48\u8D70\u52A8");
  else if (m.lastDays >= 60) seg.push("\u6709\u6BB5\u65F6\u95F4\u6CA1\u8D70\u52A8\u4E86");
  else seg.push("\u8FD1\u671F\u8FD8\u5728\u6765\u5F80");
  if (m.intimacy >= 65) seg.push("\u5173\u7CFB\u633A\u4EB2\uFF0C\u80FD\u4EA4\u5FC3");
  else if (m.intimacy >= 35) seg.push("\u5173\u7CFB\u4E0D\u9519\uFF0C\u719F\u800C\u4E0D\u817B");
  else seg.push("\u8FD8\u505C\u7559\u5728\u5BA2\u6C14\u9636\u6BB5");
  if (m.debt >= 15) seg.push(`\u6B20\u7740\u4EBA\u60C5\uFF08${Math.round(m.debt)}\uFF09\uFF0C\u8BB0\u5F97\u8FD8`);
  else if (m.debt > 0) seg.push("\u8FD8\u7565\u6B20\u70B9\u4EBA\u60C5\uFF0C\u6709\u7A7A\u56DE\u4E2A\u793C");
  else seg.push("\u4EBA\u60C5\u8D26\u6E05\u6E05\u723D\u723D\uFF0C\u4E92\u4E0D\u4E8F\u6B20");
  if (m.heat >= 70) seg.push("\u70ED\u5EA6\u5728\u7EBF\uFF0C\u8D81\u70ED\u7ECF\u8425");
  else if (m.heat < 45) seg.push("\u70ED\u5EA6\u504F\u4F4E\uFF0C\u591A\u8D70\u52A8\u4F1A\u56DE\u6696");
  return seg.join("\uFF0C") + "\u3002";
}

// packages/core/src/ledger.ts
function fmtMoney(n) {
  return "\xA5" + Math.round(Number(n) || 0).toLocaleString("zh-CN");
}
function ledgerNetShort(net) {
  const n = Number(net) || 0;
  return n === 0 ? "\u4E24\u6E05" : (n > 0 ? "\u6B20 " : "\u5E94\u6536 ") + fmtMoney(Math.abs(n));
}
function ledgerNetLabel(net) {
  const n = Number(net) || 0;
  return n === 0 ? "\u4E24\u6E05" : (n > 0 ? "\u6211\u6B20 " : "\u5BF9\u65B9\u6B20 ") + fmtMoney(Math.abs(n));
}
function eventDir(e) {
  if (!(Number(e.amount) > 0)) return "none";
  if (e.dir === "in" || e.dir === "out") return e.dir;
  if (e.type === "gift_get") return "in";
  if (e.type === "gift_give") return "out";
  return "none";
}
function personLedger(state, personId) {
  let given = 0;
  let received = 0;
  let givenCount = 0;
  let receivedCount = 0;
  let lastAmount = 0;
  let lastDir = "none";
  let lastTime = 0;
  for (const e of state.events) {
    if (e.personId !== personId) continue;
    const amt = Number(e.amount) || 0;
    if (amt <= 0) continue;
    const dir = eventDir(e);
    if (dir === "out") {
      given += amt;
      givenCount++;
    } else if (dir === "in") {
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
    status: net > 0 ? "owe" : net < 0 ? "due" : "clear"
  };
}
function ledgerTotals(state) {
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
function ledgerInsights(state, now = Date.now()) {
  const d = new Date(now);
  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  let monthGiven = 0;
  let monthReceived = 0;
  let monthCount = 0;
  let totalGiven = 0;
  let givenCount = 0;
  let maxGift = 0;
  const byOcc = {};
  for (const e of state.events) {
    const amt = Number(e.amount) || 0;
    if (amt <= 0) continue;
    const dir = eventDir(e);
    if (dir === "none") continue;
    if (fmtDate(e.time).startsWith(ym)) {
      monthCount++;
      if (dir === "out") monthGiven += amt;
      else monthReceived += amt;
    }
    if (dir === "out") {
      totalGiven += amt;
      givenCount++;
      maxGift = Math.max(maxGift, amt);
      const occ = e.occasion || "\u5176\u4ED6";
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
    topOccasion: top ? top[0] : "",
    topOccasionAmount: top ? top[1] : 0
  };
}
function settlePrefill(state, personId, kind) {
  const p = state.persons.find((x) => x.id === personId);
  if (!p) return null;
  const l = personLedger(state, personId);
  if (!l.net) return null;
  const owe = l.net > 0;
  const amount = Math.abs(l.net);
  const isLoan = kind === "loan";
  return {
    personId,
    type: isLoan ? "money" : owe ? "gift_give" : "gift_get",
    dir: owe ? "out" : "in",
    amount,
    occasion: isLoan ? "\u5176\u4ED6" : "\u8FD8\u793C",
    title: isLoan ? owe ? "\u8FD8\u6B3E" : "\u6536\u56DE\u501F\u6B3E" : owe ? "\u56DE\u793C" : "\u6536\u5230\u56DE\u793C",
    net: l.net,
    owe
  };
}
function niceAmount(n) {
  const v = Math.max(0, Number(n) || 0);
  if (v > 1e4) return Math.round(v / 1e3) * 1e3;
  return NICE_AMOUNTS.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a, 0);
}
function giftAdvice(state, personId, occasion, opts = {}) {
  const p = state.persons.find((x) => x.id === personId) || null;
  const identity = p && p.identity || "\u5176\u4ED6";
  const occ = OCCASIONS.includes(occasion) ? occasion : "\u5176\u4ED6";
  const table = GIFT_BASE[identity] || GIFT_BASE["\u5176\u4ED6"];
  const base = table[occ] || table["\u5176\u4ED6"];
  const st = state.settings || {};
  const tier = opts.tier && GIFT_TIERS[opts.tier] || st.giftTier && GIFT_TIERS[st.giftTier] || GIFT_TIERS.standard;
  const cityName = opts.city && CITY_TIERS[opts.city] ? opts.city : CITY_TIERS[st.cityTier] ? st.cityTier : "\u4E8C\u7EBF";
  const city = CITY_TIERS[cityName];
  let mid = base * tier.mult * city;
  const reasons = [
    `\u5173\u7CFB\u300C${identity}\u300D\xD7 \u573A\u5408\u300C${occ}\u300D\u7684\u57FA\u51C6\u53C2\u8003\u7EA6 ${fmtMoney(base)}\uFF08\u672A\u4E58\u6863\u4F4D/\u57CE\u5E02\u7CFB\u6570\uFF09`,
    `\u6863\u4F4D\u300C${tier.label}\u300D\xD7 \u57CE\u5E02\u300C${cityName}\u300D\u7CFB\u6570 ${city}`
  ];
  const l = personLedger(state, personId);
  const sameOcc = state.events.filter((e) => e.personId === personId && Number(e.amount) > 0 && eventDir(e) === "in" && e.occasion === occ).reduce((mx, e) => Math.max(mx, Number(e.amount)), 0);
  const maxReceived = state.events.filter((e) => e.personId === personId && Number(e.amount) > 0 && eventDir(e) === "in").reduce((mx, e) => Math.max(mx, Number(e.amount)), 0);
  if (sameOcc > 0) {
    mid = Math.max(mid, sameOcc);
    reasons.push(`\u5BF9\u65B9\u5728\u300C${occ}\u300D\u7ED9\u8FC7\u4F60 ${fmtMoney(sameOcc)}\uFF0C\u8FD8\u793C\u4E0D\u4F4E\u4E8E\u6B64\u6570\u624D\u4E0D\u5931\u793C`);
  } else if (occ === "\u8FD8\u793C" && maxReceived > 0) {
    mid = Math.max(mid, maxReceived);
    reasons.push(`\u5BF9\u65B9\u7D2F\u8BA1\u7ED9\u8FC7\u4F60 ${fmtMoney(maxReceived)}\uFF0C\u8FD8\u793C\u5EFA\u8BAE\u4E0D\u4F4E\u4E8E\u6B64\u6570`);
  } else if (l.net >= 300) {
    mid *= 1.1;
    reasons.push(`\u8D26\u672C\u4E0A\u4F60\u51C0\u6B20\u5BF9\u65B9 ${fmtMoney(l.net)}\uFF0C\u5EFA\u8BAE\u9002\u5EA6\u4E0A\u6D6E 10%`);
  }
  if (p && p.likes) reasons.push(`\u5BF9\u65B9\u559C\u6B22\uFF1A${p.likes}\uFF0C\u53EF\u4F18\u5148\u6309\u559C\u597D\u6311\u793C\u7269`);
  if (p && p.taboos) reasons.push(`\u9700\u8981\u907F\u5F00\uFF1A${p.taboos}`);
  const midA = niceAmount(mid);
  const low = niceAmount(midA * 0.7);
  const high = niceAmount(midA * 1.3);
  reasons.push(`\u7EFC\u5408\u540E\u4E2D\u4F4D\u7EA6 ${fmtMoney(mid)}\uFF0C\u6309\u5E38\u89C1\u793C\u91D1\u6570\u5B57\u53D6\u6574\u4E3A ${fmtMoney(midA)}`);
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
    note: "\u793C\u91D1\u53D7\u5730\u533A\u3001\u4EB2\u758F\u3001\u5F53\u5730\u98CE\u4FD7\u5F71\u54CD\u5F88\u5927\uFF0C\u672C\u5EFA\u8BAE\u53EA\u662F\u53C2\u8C0B\uFF0C\u6700\u7EC8\u4EE5\u4F60\u7684\u5B9E\u9645\u5173\u7CFB\u548C\u5F53\u5730\u4E60\u60EF\u4E3A\u51C6\u3002"
  };
}

// packages/core/src/health.ts
function personHealth(state, p, now = Date.now()) {
  const m = computePerson(state, p, now);
  const l = personLedger(state, p.id);
  const evs = state.events.filter((e) => e.personId === p.id);
  const conflicts = evs.filter((e) => e.type === "conflict" && now - e.time < 365 * DAY).length;
  const reciprocity = l.net === 0 ? 100 : clamp(100 - Math.abs(l.net) / 30, 20, 95);
  const score = clamp(
    Math.round(
      0.28 * m.heat + 0.22 * m.trust + 0.2 * m.intimacy + 0.15 * m.activity + 0.15 * reciprocity - conflicts * 6
    ),
    0,
    100
  );
  let level = "\u9700\u8981\u7ECF\u8425";
  let cls = "red";
  if (score >= 80) {
    level = "\u5173\u7CFB\u7A33\u56FA";
    cls = "teal";
  } else if (score >= 60) {
    level = "\u72B6\u6001\u4E0D\u9519";
    cls = "green";
  } else if (score >= 40) {
    level = "\u53EF\u4EE5\u66F4\u597D";
    cls = "amber";
  }
  const tips = [];
  if (m.debt >= 20) tips.push("\u4EBA\u60C5\u503A\u504F\u9AD8\uFF0C\u8FD1\u671F\u5B89\u6392\u4E00\u6B21\u56DE\u793C\u6216\u8BF7\u996D");
  if (l.net > 0) tips.push(`\u8D26\u672C\u51C0\u6B20 ${fmtMoney(l.net)}\uFF0C\u627E\u673A\u4F1A\u8FD8\u4E0A\u6216\u56DE\u4E2A\u7B49\u503C\u793C`);
  else if (l.net < 0) tips.push(`\u5BF9\u65B9\u51C0\u6B20 ${fmtMoney(-l.net)}\uFF0C\u53EF\u6E29\u548C\u63D0\u9192\uFF0C\u4E5F\u53EF\u7B49\u5BF9\u65B9\u4E3B\u52A8`);
  if (m.lastDays === null) tips.push("\u8FD8\u6CA1\u6709\u5F80\u6765\u8BB0\u5F55\uFF0C\u5148\u4ECE\u4E00\u6B21\u8F7B\u91CF\u95EE\u5019\u5F00\u59CB");
  else if (m.lastDays >= 60) tips.push(`${m.lastDays} \u5929\u6CA1\u8054\u7CFB\uFF0C\u53D1\u53E5\u8FD1\u51B5\u95EE\u5019\u7834\u51B0`);
  if (conflicts) tips.push(`\u8FD1\u4E00\u5E74\u6709 ${conflicts} \u6B21\u6469\u64E6\uFF0C\u9002\u5F53\u964D\u6E29\u3001\u5C31\u4E8B\u8BBA\u4E8B`);
  if (!tips.length) tips.push("\u4FDD\u6301\u5F53\u524D\u8282\u594F\uFF0C\u5076\u5C14\u5206\u4EAB\u8FD1\u51B5\u5C31\u80FD\u7EF4\u7CFB");
  return { score, level, cls, tips, reciprocity: Math.round(reciprocity), conflicts };
}
function healthRanking(state, now = Date.now()) {
  return state.persons.map((p) => ({ p, h: personHealth(state, p, now), l: personLedger(state, p.id) })).sort((a, b) => a.h.score - b.h.score || a.p.name.localeCompare(b.p.name, "zh"));
}

// packages/core/src/actions.ts
function buildActions(state, limit = 6, now = Date.now()) {
  const out = [];
  const push = (a) => out.push(a);
  for (const p of state.persons) {
    const m = computePerson(state, p, now);
    const l = personLedger(state, p.id);
    if (p.birthday) {
      const d = daysUntil(p.birthday, now);
      if (d >= 0 && d <= 7) {
        push({
          key: "bday:" + p.id,
          personId: p.id,
          tone: "teal",
          icon: "bday",
          prio: d <= 1 ? 92 : 84,
          title: `${p.name} \u7684\u751F\u65E5${d === 0 ? "\u5C31\u662F\u4ECA\u5929" : `\u8FD8\u6709 ${d} \u5929`}`,
          reason: "\u751F\u65E5\u662F\u4F4E\u6210\u672C\u3001\u9AD8\u56DE\u62A5\u7684\u8D70\u52A8\u65F6\u673A\uFF0C\u4E00\u53E5\u795D\u798F\u6BD4\u4E34\u65F6\u9001\u793C\u66F4\u81EA\u7136\u3002",
          primary: { label: "\u5199\u53E5\u795D\u798F", act: "scriptModal", arg: "birthday|" + p.id },
          secondary: { label: "\u8BB0\u4E00\u7B14", act: "eventQuick", arg: p.id }
        });
      }
    }
    if (p.anniversary) {
      const d = daysUntil(p.anniversary, now);
      if (d >= 0 && d <= 7) {
        push({
          key: "ann:" + p.id,
          personId: p.id,
          tone: "teal",
          icon: "bday",
          prio: d <= 1 ? 90 : 80,
          title: `${p.name} \u7684\u91CD\u8981\u7EAA\u5FF5\u65E5${d === 0 ? "\u5C31\u662F\u4ECA\u5929" : `\u8FD8\u6709 ${d} \u5929`}`,
          reason: "\u7EAA\u5FF5\u65E5\u6BD4\u751F\u65E5\u66F4\u79C1\u5BC6\uFF0C\u63D0\u4E00\u53E5\u4F1A\u8BA9\u5BF9\u65B9\u89C9\u5F97\u4F60\u771F\u7684\u8BB0\u5F97\u3002",
          primary: { label: "\u5199\u53E5\u8BDD", act: "scriptModal", arg: "anniversary|" + p.id },
          secondary: { label: "\u8BB0\u4E00\u7B14", act: "eventQuick", arg: p.id }
        });
      }
    }
    if (m.debt >= 20) {
      push({
        key: "debt:" + p.id,
        personId: p.id,
        tone: "amber",
        icon: "debt",
        prio: 82,
        title: `\u8FD8 ${p.name} \u7684\u4EBA\u60C5`,
        reason: `\u4F60\u6B20\u7740 ${Math.round(m.debt)} \u70B9\u4EBA\u60C5\uFF0C\u62D6\u4E45\u4E86\u4F1A\u53D8\u6210\u5FC3\u7406\u8D1F\u62C5\u3002\u7EA6\u987F\u996D\u6216\u56DE\u4E2A\u793C\uFF0C\u628A\u8BDD\u8BF4\u5F00\u3002`,
        primary: { label: "\u600E\u4E48\u56DE\u793C", act: "giftModal", arg: p.id },
        secondary: { label: "\u8BB0\u4E00\u7B14", act: "eventQuick", arg: p.id }
      });
    }
    if (l.net >= 300) {
      push({
        key: "money-owe:" + p.id,
        personId: p.id,
        tone: "amber",
        icon: "money",
        prio: 78,
        title: `\u4F60\u5728\u8D26\u672C\u4E0A\u51C0\u6B20 ${p.name} ${fmtMoney(l.net)}`,
        reason: "\u94B1\u548C\u793C\u90FD\u8981\u6709\u6765\u6709\u5F80\u3002\u5148\u786E\u8BA4\u662F\u793C\u91D1\u8FD8\u662F\u501F\u6B3E\uFF0C\u518D\u51B3\u5B9A\u56DE\u793C\u8FD8\u662F\u8FD8\u6B3E\u3002",
        primary: { label: "\u8FD8\u793C\u53C2\u8C0B", act: "giftModal", arg: p.id },
        secondary: { label: "\u53BB\u8BB0\u5F55", act: "eventQuick", arg: p.id }
      });
    } else if (l.net <= -300) {
      push({
        key: "money-due:" + p.id,
        personId: p.id,
        tone: "blue",
        icon: "money",
        prio: 46,
        title: `${p.name} \u8FD8\u6B20\u4F60 ${fmtMoney(-l.net)}`,
        reason: "\u5982\u679C\u662F\u501F\u6B3E\uFF0C\u627E\u4E2A\u8F7B\u677E\u7684\u7531\u5934\u63D0\u4E00\u53E5\uFF1B\u5982\u679C\u662F\u793C\u91D1\uFF0C\u7B49\u5408\u9002\u573A\u5408\u81EA\u7136\u56DE\u793C\u5373\u53EF\u3002",
        primary: { label: "\u50AC\u8FD8\u8BDD\u672F", act: "scriptModal", arg: "collect_debt|" + p.id },
        secondary: { label: "\u53BB\u8BB0\u5F55", act: "eventQuick", arg: p.id }
      });
    }
    if (m.lastDays !== null && m.lastDays >= 60) {
      push({
        key: "stale:" + p.id,
        personId: p.id,
        tone: "red",
        icon: "stale",
        prio: 72,
        title: `\u548C ${p.name} \u5DF2 ${m.lastDays} \u5929\u6CA1\u5F80\u6765`,
        reason: "\u5173\u7CFB\u4E0D\u662F\u9760\u5927\u4E8B\u7EF4\u7CFB\u7684\u3002\u53D1\u4E00\u53E5\u8FD1\u51B5\u3001\u7EA6\u4E00\u6B21\u996D\uFF0C\u6BD4\u9022\u5E74\u8FC7\u8282\u7FA4\u53D1\u66F4\u6709\u7528\u3002",
        primary: { label: "\u7834\u51B0\u8BDD\u672F", act: "scriptModal", arg: "reconnect|" + p.id },
        secondary: { label: "\u8BB0\u4E00\u7B14", act: "eventQuick", arg: p.id }
      });
    }
    const helps = state.events.filter((e) => e.personId === p.id && e.type === "help_them").sort((a, b) => b.time - a.time);
    if (helps.length) {
      const age = (now - helps[0].time) / DAY;
      if (age >= 1 && age <= 10) {
        push({
          key: "thanks:" + p.id,
          personId: p.id,
          tone: "teal",
          icon: "thanks",
          prio: 68,
          title: `\u5411 ${p.name} \u9053\u4E2A\u8C22`,
          reason: `\u300C${helps[0].title || "\u5BF9\u65B9\u5E2E\u4E86\u4F60"}\u300D\u5DF2\u7ECF\u8FC7\u53BB ${Math.floor(age)} \u5929\uFF0C\u53CA\u65F6\u53CD\u9988\u6BD4\u4E8B\u540E\u8865\u793C\u66F4\u8BA9\u4EBA\u8212\u670D\u3002`,
          primary: { label: "\u9053\u8C22\u8BDD\u672F", act: "scriptModal", arg: "thanks|" + p.id },
          secondary: { label: "\u8BB0\u4E00\u7B14", act: "eventQuick", arg: p.id }
        });
      }
    }
    if (["\u9886\u5BFC", "\u5BA2\u6237", "\u957F\u8F88"].includes(p.identity) && m.lastDays !== null && m.lastDays >= 45 && m.lastDays < 60) {
      push({
        key: "key:" + p.id,
        personId: p.id,
        tone: "blue",
        icon: "key",
        prio: 52,
        title: `\u7EF4\u62A4 ${p.name} \u8FD9\u6761\u5173\u952E\u5173\u7CFB`,
        reason: `\u300C${p.identity}\u300D\u5173\u7CFB\u4E0D\u5B9C\u957F\u671F\u65AD\u8054\uFF0C45 \u5929\u662F\u4E2A\u81EA\u7136\u7684\u95EE\u5019\u8282\u70B9\u3002`,
        primary: { label: "\u7EA6\u4E00\u4E0B", act: "scriptModal", arg: "invite|" + p.id },
        secondary: { label: "\u8BB0\u4E00\u7B14", act: "eventQuick", arg: p.id }
      });
    }
  }
  for (const r of state.reminders) {
    if (r.status === "pending" && (!r.date || r.date <= todayStr(now))) {
      const p = state.persons.find((x) => x.id === r.personId);
      push({
        key: "todo:" + r.id,
        personId: r.personId || "",
        tone: "blue",
        icon: "todo",
        prio: 95,
        title: `\u5F85\u529E\uFF1A${r.content}`,
        reason: (p ? p.name + " \xB7 " : "") + (r.date ? `\u7EA6\u5B9A\u65E5\u671F ${r.date}` : "\u6CA1\u6709\u8BBE\u5B9A\u65E5\u671F\uFF0C\u4ECA\u5929\u5904\u7406\u6389"),
        primary: { label: "\u5B8C\u6210", act: "quickDone", arg: r.id },
        secondary: p ? { label: "\u8BB0\u4E00\u7B14", act: "eventQuick", arg: p.id } : null
      });
    }
  }
  const fst = upcomingFestival(now);
  if (fst) {
    push({
      key: "festival",
      personId: "",
      tone: "blue",
      icon: "fest",
      prio: fst.days <= 1 ? 86 : 40,
      title: `${fst.days === 0 ? "\u4ECA\u5929\u662F" : fst.days + " \u5929\u540E\u662F"}${fst.n}`,
      reason: "\u8282\u65E5\u795D\u798F\u9002\u5408\u7FA4\u53D1\uFF0C\u4F46\u5BF9\u91CD\u8981\u7684\u4EBA\u8981\u5355\u72EC\u6539\u4E00\u53E5\uFF0C\u624D\u6709\u6E29\u5EA6\u3002",
      primary: { label: "\u5199\u795D\u798F", act: "scriptModal", arg: "festival|" },
      secondary: { label: "\u770B\u4EBA\u8109", act: "go", arg: "persons" }
    });
  }
  out.sort((a, b) => b.prio - a.prio);
  const seen = /* @__PURE__ */ new Set();
  const picked = [];
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

// packages/core/src/scripts.ts
var SCRIPT_TONES = [
  { id: "stable", label: "\u7A33\u59A5\u7248" },
  { id: "close", label: "\u4EB2\u8FD1\u7248" },
  { id: "brief", label: "\u7B80\u77ED\u7248" }
];
var SCRIPT_SCENES = [
  {
    id: "reconnect",
    label: "\u4E45\u672A\u8054\u7CFB\u7834\u51B0",
    hint: "\u9002\u5408\u51E0\u4E2A\u6708\u6CA1\u8BF4\u8BDD\u7684\u4EBA\uFF0C\u5148\u7ED9\u53F0\u9636\u518D\u7EA6\u89C1",
    build: (c) => ({
      stable: `${c.name}\uFF0C\u597D\u4E45\u6CA1\u8054\u7CFB\u4E86\u3002\u6700\u8FD1\u6574\u7406\u901A\u8BAF\u5F55\u770B\u5230\u60A8\uFF0C\u60F3\u8D77\u4E4B\u524D${["talk", "meal"].includes(c.eventType) && c.eventTitle ? c.eventTitle : "\u4E00\u8D77\u804A\u8FC7\u7684\u4E8B"}\uFF0C\u4E00\u76F4\u8BB0\u7740\u3002\u6700\u8FD1\u8FD8\u987A\u5229\u5417\uFF1F\u6709\u7A7A\u6211\u8BF7\u60A8\u559D\u676F\u8336\u3002`,
      close: `${c.name}\uFF0C\u5931\u8E2A\u4EBA\u53E3\u56DE\u5F52\u4E00\u4E0B\u3002\u6700\u8FD1\u548B\u6837\uFF1F\u521A\u8DEF\u8FC7\u4F60\u90A3\u8FB9\u7A81\u7136\u60F3\u8D77\u4F60\uFF0C\u6539\u5929\u7EA6\u4E2A\u996D\u3002`,
      brief: `${c.name}\uFF0C\u597D\u4E45\u4E0D\u89C1\uFF0C\u6700\u8FD1\u8FD8\u597D\u5417\uFF1F\u6709\u7A7A\u805A\u805A\u3002`
    })
  },
  {
    id: "thanks",
    label: "\u9053\u8C22/\u56DE\u9988",
    hint: "\u5BF9\u65B9\u5E2E\u8FC7\u4F60\uFF0C\u522B\u53EA\u8BF4\u300C\u8C22\u8C22\u300D\uFF0C\u7ED9\u4E00\u4E2A\u5177\u4F53\u53CD\u9988",
    build: (c) => ({
      stable: `${c.name}\uFF0C\u4E0A\u6B21${c.eventTitle ? `\u300C${c.eventTitle}\u300D` : "\u90A3\u4EF6\u4E8B"}\u591A\u4E8F\u60A8\u5E2E\u5FD9\uFF0C\u4E8B\u60C5\u5DF2\u7ECF\u987A\u5229\u89E3\u51B3\u4E86\u3002\u4E00\u76F4\u60F3\u6B63\u5F0F\u8BF4\u58F0\u8C22\u8C22\uFF0C\u6539\u5929\u6211\u8BF7\u60A8\u5403\u4E2A\u996D\u3002`,
      close: `${c.name}\uFF0C\u4E0A\u6B21\u90A3\u4E8B\u771F\u5E2E\u6211\u5927\u5FD9\u4E86\uFF0C\u8BB0\u4F60\u4E00\u8F88\u5B50\u3002\u522B\u8DDF\u6211\u5BA2\u6C14\uFF0C\u6539\u5929\u8BF7\u4F60\u5403\u996D\u3002`,
      brief: `${c.name}\uFF0C\u4E0A\u6B21\u7684\u4E8B\u591A\u8C22\u4E86\uFF0C\u6539\u5929\u8BF7\u4F60\u5403\u996D\u3002`
    })
  },
  {
    id: "apology",
    label: "\u9053\u6B49\u548C\u89E3",
    hint: "\u5148\u8BA4\u9519\u3001\u4E0D\u627E\u501F\u53E3\uFF0C\u518D\u7ED9\u4E00\u4E2A\u5177\u4F53\u7684\u8865\u6551\u52A8\u4F5C",
    build: (c) => ({
      stable: `${c.name}\uFF0C\u4E0A\u6B21${c.context ? `\u5173\u4E8E${c.context}` : "\u90A3\u4EF6\u4E8B"}\u662F\u6211\u8003\u8651\u4E0D\u5468\uFF0C\u8BA9\u60A8\u4E0D\u8212\u670D\u4E86\u3002\u6211\u4E0D\u627E\u501F\u53E3\uFF0C\u5148\u8DDF\u60A8\u8BF4\u58F0\u5BF9\u4E0D\u8D77\u3002\u5982\u679C\u60A8\u613F\u610F\uFF0C\u6211\u60F3\u627E\u4E2A\u65F6\u95F4\u5F53\u9762\u804A\u804A\u3002`,
      close: `${c.name}\uFF0C\u4E0A\u6B21\u662F\u6211\u4E0A\u5934\u4E86\uFF0C\u8BF4\u8BDD\u6CA1\u8FC7\u8111\u5B50\u3002\u54B1\u4FE9\u8FD9\u4E48\u591A\u5E74\uFF0C\u6211\u4E0D\u60F3\u56E0\u4E3A\u8FD9\u70B9\u4E8B\u751F\u5206\u3002\u7ED9\u6211\u4E2A\u673A\u4F1A\uFF0C\u8BF7\u4F60\u5403\u996D\u8D54\u7F6A\u3002`,
      brief: `${c.name}\uFF0C\u4E0A\u6B21\u7684\u4E8B\u662F\u6211\u4E0D\u5BF9\uFF0C\u8DDF\u4F60\u8BF4\u58F0\u62B1\u6B49\u3002\u6709\u7A7A\u6211\u5F53\u9762\u804A\u3002`
    })
  },
  {
    id: "ask_favor",
    label: "\u8BF7\u4EBA\u5E2E\u5FD9",
    hint: "\u628A\u9009\u62E9\u6743\u7559\u7ED9\u5BF9\u65B9\uFF0C\u660E\u786E\u300C\u4E0D\u65B9\u4FBF\u4E5F\u6CA1\u5173\u7CFB\u300D",
    build: (c) => ({
      stable: `${c.name}\uFF0C\u6709\u4E2A\u4E8B\u60F3\u8BF7\u60A8\u6307\u70B9\u4E00\u4E0B${c.context ? `\uFF1A${c.context}` : ""}\u3002\u6211\u77E5\u9053\u60A8\u5728\u8FD9\u65B9\u9762\u6709\u7ECF\u9A8C\uFF0C\u4E0D\u77E5\u9053\u6700\u8FD1\u65B9\u4E0D\u65B9\u4FBF\uFF1F\u5982\u679C\u4E0D\u65B9\u4FBF\u4E5F\u5B8C\u5168\u6CA1\u5173\u7CFB\uFF0C\u6211\u518D\u60F3\u522B\u7684\u529E\u6CD5\u3002`,
      close: `${c.name}\uFF0C\u9047\u5230\u4E2A\u574E\uFF0C\u7B2C\u4E00\u4E2A\u60F3\u5230\u4F60${c.context ? `\uFF1A${c.context}` : ""}\u3002\u4F60\u65B9\u4FBF\u7684\u65F6\u5019\u5E2E\u6211\u770B\u770B\uFF0C\u4E0D\u65B9\u4FBF\u5C31\u76F4\u8BF4\uFF0C\u522B\u4E3A\u96BE\u3002`,
      brief: `${c.name}\uFF0C\u6709\u4E2A\u4E8B\u60F3\u8BF7\u6559\u60A8${c.context ? `\uFF1A${c.context}` : ""}\uFF0C\u65B9\u4FBF\u65F6\u56DE\u6211\u5C31\u884C\u3002`
    })
  },
  {
    id: "decline",
    label: "\u5A49\u62D2\u8BF7\u6C42",
    hint: "\u5148\u63A5\u4F4F\u5BF9\u65B9\u7684\u9762\u5B50\uFF0C\u518D\u6E05\u695A\u5730\u8BF4\u300C\u8FD9\u6B21\u4E0D\u884C\u300D",
    build: (c) => ({
      stable: `${c.name}\uFF0C\u60A8\u8BF4\u7684\u8FD9\u4E8B\u6211\u8BA4\u771F\u60F3\u8FC7\u4E86\u3002${c.context ? `\u5173\u4E8E${c.context}\uFF0C` : ""}\u8FD9\u6B21\u6211\u786E\u5B9E\u5E2E\u4E0D\u4E0A\uFF0C\u6015\u7B54\u5E94\u4E86\u53CD\u800C\u803D\u8BEF\u60A8\u3002\u8981\u662F\u6709\u5176\u4ED6\u6211\u80FD\u505A\u7684\uFF0C\u60A8\u5C3D\u7BA1\u8BF4\u3002`,
      close: `${c.name}\uFF0C\u8FD9\u4E8B\u6211\u8FD9\u6B21\u771F\u63A5\u4E0D\u4F4F\uFF0C\u4E0D\u662F\u8DDF\u4F60\u5BA2\u6C14\u3002${c.context ? `${c.context}\u8FD9\u5757\u6211\u786E\u5B9E\u6CA1\u628A\u63E1\u3002` : ""}\u4E0B\u6B21\u6709\u6211\u80FD\u642D\u628A\u624B\u7684\u5730\u65B9\uFF0C\u4F60\u76F4\u63A5\u558A\u6211\u3002`,
      brief: `${c.name}\uFF0C\u8FD9\u6B21\u5B9E\u5728\u4E0D\u65B9\u4FBF\uFF0C\u5E2E\u4E0D\u4E0A\u5FD9\uFF0C\u62B1\u6B49\u3002`
    })
  },
  {
    id: "refuse_loan",
    label: "\u62D2\u7EDD\u501F\u94B1",
    hint: "\u5171\u60C5 + \u660E\u786E\u8FB9\u754C + \u7ED9\u66FF\u4EE3\u5E2E\u52A9\uFF0C\u522B\u542B\u7CCA\u62D6\u6210\u8BEF\u4F1A",
    build: (c) => ({
      stable: `${c.name}\uFF0C\u60A8\u5F00\u53E3\u80AF\u5B9A\u662F\u9047\u5230\u96BE\u5904\u4E86\u3002${c.context ? `\u5173\u4E8E${c.context}\uFF0C` : ""}\u4E0D\u7792\u60A8\u8BF4\uFF0C\u6211\u6700\u8FD1\u624B\u5934\u4E5F\u7D27\uFF0C\u5B9E\u5728\u62FF\u4E0D\u51FA\u8FD9\u7B14\u94B1\u3002\u4E0D\u662F\u4E0D\u5E2E\uFF0C\u662F\u6015\u7B54\u5E94\u4E86\u803D\u8BEF\u60A8\u3002`,
      close: `${c.name}\uFF0C\u4F60\u77E5\u9053\u6211\u4E0D\u662F\u5C0F\u6C14\u7684\u4EBA\uFF0C\u4F46\u8FD9\u6B21\u771F\u62FF\u4E0D\u51FA\u6765\u3002${c.context ? `${c.context}\u8FD9\u4E2A\u6570\u6211\u786E\u5B9E\u6CA1\u6709\u3002` : ""}\u8981\u4E0D\u6211\u5E2E\u4F60\u60F3\u60F3\u522B\u7684\u8DEF\u5B50\uFF1F`,
      brief: `${c.name}\uFF0C\u8FD9\u6B21\u624B\u5934\u771F\u7D27\uFF0C\u501F\u4E0D\u4E86\uFF0C\u62B1\u6B49\u3002`
    })
  },
  {
    id: "collect_debt",
    label: "\u50AC\u8FD8/\u63D0\u9192",
    hint: "\u7ED9\u5177\u4F53\u65F6\u95F4\u70B9\uFF0C\u8BED\u6C14\u5E73\u548C\uFF0C\u522B\u8BA9\u4EBA\u4E0B\u4E0D\u6765\u53F0",
    build: (c) => ({
      stable: `${c.name}\uFF0C\u6700\u8FD1\u6574\u7406\u8D26\u672C\u770B\u5230\u4E4B\u524D${c.context ? c.context : "\u90A3\u7B14\u94B1"}\uFF0C\u60F3\u8DDF\u60A8\u786E\u8BA4\u4E00\u4E0B\u5927\u6982\u4EC0\u4E48\u65F6\u5019\u65B9\u4FBF\uFF1F\u6211\u8FD9\u8FB9\u6700\u8FD1\u4E5F\u6709\u70B9\u5B89\u6392\uFF0C\u4E0D\u7740\u6025\uFF0C\u60A8\u65B9\u4FBF\u65F6\u56DE\u6211\u5C31\u884C\u3002`,
      close: `${c.name}\uFF0C\u6700\u8FD1\u624B\u5934\u6709\u70B9\u7D27\uFF0C\u4E4B\u524D${c.context ? c.context : "\u90A3\u7B14\u94B1"}\u4F60\u770B\u8FD9\u5468\u65B9\u4FBF\u5148\u8FD8\u4E00\u90E8\u5206\u5417\uFF1F\u5269\u4E0B\u7684\u54B1\u4EEC\u518D\u5546\u91CF\u3002`,
      brief: `${c.name}\uFF0C\u4E4B\u524D\u90A3\u7B14\u94B1\u6700\u8FD1\u65B9\u4FBF\u8FD8\u5417\uFF1F\u6211\u8FD9\u8FB9\u6709\u70B9\u6025\u7528\u3002`
    })
  },
  {
    id: "gift",
    label: "\u968F\u793C/\u8FD8\u793C",
    hint: "\u91D1\u989D\u4E4B\u5916\uFF0C\u4E00\u53E5\u5F97\u4F53\u7684\u8BDD\u66F4\u91CD\u8981",
    build: (c) => ({
      stable: `${c.name}\uFF0C${c.context ? c.context : "\u60A8\u7684\u597D\u65E5\u5B50"}\u6211\u8BB0\u7740\u5462\u3002\u4E00\u70B9\u5FC3\u610F\uFF0C\u4E0D\u6210\u656C\u610F\uFF0C\u795D\u60A8\u4E00\u5207\u987A\u9042\u3002`,
      close: `${c.name}\uFF0C${c.context ? c.context : "\u4F60\u7684\u4E8B"}\u5C31\u662F\u6211\u7684\u4E8B\u3002\u7EA2\u5305\u6536\u4E0B\uFF0C\u522B\u8DDF\u6211\u5BA2\u6C14\uFF0C\u6539\u5929\u518D\u805A\u3002`,
      brief: `${c.name}\uFF0C\u4E00\u70B9\u5FC3\u610F\uFF0C\u795D\u597D\u3002`
    })
  },
  {
    id: "toast",
    label: "\u656C\u9152/\u996D\u5C40",
    hint: "\u5148\u7ED9\u5BF9\u65B9\u9762\u5B50\uFF0C\u518D\u8868\u8FBE\u81EA\u5DF1\uFF0C\u6700\u540E\u7559\u4F59\u5730",
    build: (c) => ({
      stable: `${c.name}\uFF0C\u8FD9\u676F\u6211\u656C\u60A8\u3002${c.context ? `${c.context}\uFF0C` : ""}\u5E73\u65F6\u591A\u627F\u60A8\u7167\u987E\uFF0C\u5F88\u591A\u8BDD\u5728\u9152\u91CC\u4E86\uFF0C\u60A8\u968F\u610F\uFF0C\u6211\u5E72\u4E86\u3002`,
      close: `${c.name}\uFF0C\u8FD9\u676F\u5FC5\u987B\u656C\u4F60\u3002${c.context ? `${c.context}\uFF0C` : ""}\u522B\u7684\u5148\u4E0D\u8BF4\uFF0C\u90FD\u5728\u9152\u91CC\u3002`,
      brief: `${c.name}\uFF0C\u8FD9\u676F\u656C\u60A8\uFF0C\u6211\u5E72\u4E86\u3002`
    })
  },
  {
    id: "visit_sick",
    label: "\u63A2\u75C5/\u6170\u95EE",
    hint: "\u5C11\u8BB2\u5927\u9053\u7406\uFF0C\u591A\u7ED9\u5177\u4F53\u5E2E\u52A9",
    build: (c) => ({
      stable: `${c.name}\uFF0C\u542C\u8BF4\u60A8\u6700\u8FD1\u8EAB\u4F53\u4E0D\u592A\u8212\u670D\uFF0C\u4E00\u76F4\u60E6\u8BB0\u7740\u3002${c.context ? `${c.context}` : ""}\u60A8\u5148\u5B89\u5FC3\u517B\u7740\uFF0C\u6709\u4EC0\u4E48\u9700\u8981\u8DD1\u817F\u7684\u968F\u65F6\u62DB\u547C\u6211\u3002\u7B49\u6211\u8FC7\u4E24\u5929\u53BB\u770B\u60A8\u3002`,
      close: `${c.name}\uFF0C\u542C\u8BF4\u4F60\u4F4F\u9662\u4E86\uFF0C\u522B\u786C\u625B\u3002${c.context ? `${c.context}` : ""}\u9700\u8981\u5565\u7ED9\u6211\u53D1\u6D88\u606F\uFF0C\u522B\u5BA2\u6C14\u3002`,
      brief: `${c.name}\uFF0C\u542C\u8BF4\u60A8\u8EAB\u4F53\u4E0D\u9002\uFF0C\u591A\u4FDD\u91CD\uFF0C\u9700\u8981\u5E2E\u5FD9\u968F\u65F6\u8BF4\u3002`
    })
  },
  {
    id: "decline_invite",
    label: "\u5A49\u62D2\u996D\u5C40",
    hint: "\u62D2\u7EDD\u7684\u662F\u8FD9\u6B21\uFF0C\u4E0D\u662F\u8FD9\u6BB5\u5173\u7CFB",
    build: (c) => ({
      stable: `${c.name}\uFF0C\u8C22\u8C22\u60A8\u60F3\u7740\u6211\u3002${c.context ? `${c.context}\u90A3\u5929` : ""}\u6211\u8FD9\u8FB9\u521A\u597D\u6709\u5B89\u6392\uFF0C\u5B9E\u5728\u53BB\u4E0D\u4E86\uFF0C\u633A\u9057\u61BE\u7684\u3002\u4E0B\u6B21\u6709\u673A\u4F1A\u6211\u6765\u7EC4\u5C40\uFF0C\u54B1\u4EEC\u518D\u805A\u3002`,
      close: `${c.name}\uFF0C\u8FD9\u6B21\u771F\u53BB\u4E0D\u4E86\uFF0C${c.context ? `${c.context}\u90A3\u5929` : ""}\u649E\u4E0A\u4E86\u3002\u4F60\u4EEC\u73A9\u5F97\u5F00\u5FC3\uFF0C\u4E0B\u6B21\u6211\u8BF7\u3002`,
      brief: `${c.name}\uFF0C\u90A3\u5929\u5B9E\u5728\u53BB\u4E0D\u4E86\uFF0C\u62B1\u6B49\uFF0C\u4E0B\u6B21\u518D\u805A\u3002`
    })
  },
  {
    id: "festival",
    label: "\u8282\u65E5\u795D\u798F",
    hint: "\u7ED9\u91CD\u8981\u7684\u4EBA\u5355\u72EC\u6539\u4E00\u53E5\uFF0C\u522B\u7FA4\u53D1",
    build: (c) => ({
      stable: `${c.name}\uFF0C${c.context ? c.context : "\u8282\u65E5"}\u5FEB\u4E50\u3002\u8FC7\u53BB\u4E00\u5E74\u591A\u8C22\u60A8\u7684\u5173\u7167\uFF0C\u795D\u60A8\u548C\u5BB6\u4EBA\u8EAB\u4F53\u5B89\u5EB7\u3001\u8BF8\u4E8B\u987A\u9042\u3002`,
      close: `${c.name}\uFF0C${c.context ? c.context : "\u8282\u65E5"}\u5FEB\u4E50\u5440\u3002\u522B\u7684\u865A\u7684\u4E0D\u8BF4\uFF0C\u795D\u4F60\u5403\u597D\u559D\u597D\uFF0C\u4E8B\u4E8B\u987A\u5FC3\u3002`,
      brief: `${c.name}\uFF0C${c.context ? c.context : "\u8282\u65E5"}\u5FEB\u4E50\uFF0C\u795D\u597D\u3002`
    })
  },
  {
    id: "invite",
    label: "\u7EA6\u996D/\u8D70\u52A8",
    hint: "\u7ED9\u4E24\u4E2A\u65F6\u95F4\u9009\u9879\uFF0C\u964D\u4F4E\u5BF9\u65B9\u51B3\u7B56\u6210\u672C",
    build: (c) => ({
      stable: `${c.name}\uFF0C\u6700\u8FD1\u60F3\u8D77\u60A8\uFF0C\u4E0D\u77E5\u9053\u8FD9\u5468\u6216\u4E0B\u5468\u54EA\u5929\u65B9\u4FBF\uFF1F\u60F3\u8BF7\u60A8\u5403\u4E2A\u4FBF\u996D\uFF0C\u5730\u65B9\u60A8\u5B9A\uFF0C\u6211\u8FC7\u53BB\u63A5\u60A8\u3002`,
      close: `${c.name}\uFF0C\u597D\u4E45\u6CA1\u805A\u4E86\uFF0C\u8FD9\u5468\u6709\u7A7A\u6CA1\uFF1F\u64B8\u4E32\u706B\u9505\u4F60\u6311\uFF0C\u6211\u8BF7\u3002`,
      brief: `${c.name}\uFF0C\u6700\u8FD1\u6709\u7A7A\u5417\uFF1F\u60F3\u7EA6\u60A8\u5403\u4E2A\u996D\u3002`
    })
  },
  {
    id: "follow_up",
    label: "\u4E8B\u540E\u8DDF\u8FDB",
    hint: "\u8BA9\u5BF9\u65B9\u77E5\u9053\u4E8B\u60C5\u6709\u8FDB\u5C55\uFF0C\u5173\u7CFB\u624D\u6709\u4E0B\u4E00\u6B21",
    build: (c) => ({
      stable: `${c.name}\uFF0C\u4E0A\u6B21\u8BF7\u60A8\u5E2E\u5FD9\u7684\u4E8B\u5DF2\u7ECF\u6709\u8FDB\u5C55\u4E86${c.context ? `\uFF1A${c.context}` : ""}\uFF0C\u7279\u610F\u8DDF\u60A8\u8BF4\u4E00\u58F0\uFF0C\u4E5F\u8BA9\u60A8\u653E\u5FC3\u3002\u540E\u9762\u6709\u7ED3\u679C\u6211\u518D\u540C\u6B65\u3002`,
      close: `${c.name}\uFF0C\u4E0A\u6B21\u90A3\u4E8B\u529E\u5F97\u5DEE\u4E0D\u591A\u4E86${c.context ? `\uFF1A${c.context}` : ""}\uFF0C\u8DDF\u4F60\u8BF4\u4E00\u58F0\u3002\u56DE\u5934\u8BF7\u4F60\u5403\u996D\u3002`,
      brief: `${c.name}\uFF0C\u4E0A\u6B21\u7684\u4E8B\u6709\u8FDB\u5C55\u4E86${c.context ? `\uFF1A${c.context}` : ""}\uFF0C\u8C22\u8C22\u60A8\u3002`
    })
  },
  {
    id: "birthday",
    label: "\u751F\u65E5\u795D\u798F",
    hint: "\u522B\u53EA\u53D1\u300C\u751F\u65E5\u5FEB\u4E50\u300D\uFF0C\u52A0\u4E00\u4E2A\u4F60\u4EEC\u4E4B\u95F4\u7684\u7EC6\u8282",
    build: (c) => ({
      stable: `${c.name}\uFF0C\u751F\u65E5\u5FEB\u4E50\uFF01\u795D\u60A8\u65B0\u7684\u4E00\u5C81\u8EAB\u4F53\u5065\u5EB7\u3001\u4E8B\u4E8B\u987A\u5FC3\u3002\u4E00\u70B9\u795D\u798F\uFF0C\u6539\u5929\u518D\u5F53\u9762\u9053\u8D3A\u3002`,
      close: `${c.name}\uFF0C\u751F\u65E5\u5FEB\u4E50\u5440\uFF01\u53C8\u957F\u4E00\u5C81\uFF0C\u613F\u4F60\u60F3\u8981\u7684\u90FD\u62E5\u6709\uFF0C\u5F97\u4E0D\u5230\u7684\u90FD\u91CA\u6000\u3002\u6539\u5929\u805A\u3002`,
      brief: `${c.name}\uFF0C\u751F\u65E5\u5FEB\u4E50\uFF0C\u795D\u597D\u3002`
    })
  },
  {
    id: "anniversary",
    label: "\u7EAA\u5FF5\u65E5\u95EE\u5019",
    hint: "\u6BD4\u751F\u65E5\u66F4\u79C1\u5BC6\uFF0C\u9002\u5408\u5173\u7CFB\u8F83\u8FD1\u7684\u4EBA",
    build: (c) => ({
      stable: `${c.name}\uFF0C\u4ECA\u5929\u662F\u60A8\u7684\u91CD\u8981\u65E5\u5B50\uFF0C\u7279\u610F\u6765\u9053\u58F0\u795D\u798F\u3002\u613F\u5F80\u540E\u6BCF\u5E74\u4ECA\u65E5\uFF0C\u90FD\u6709\u597D\u5FC3\u60C5\u3002`,
      close: `${c.name}\uFF0C\u7EAA\u5FF5\u65E5\u5FEB\u4E50\u3002\u65F6\u95F4\u771F\u5FEB\uFF0C\u6539\u5929\u89C1\u9762\u804A\u3002`,
      brief: `${c.name}\uFF0C\u7EAA\u5FF5\u65E5\u5FEB\u4E50\u3002`
    })
  }
];
function buildScripts(state, sceneId, personId, context) {
  const sc = SCRIPT_SCENES.find((x) => x.id === sceneId) || SCRIPT_SCENES[0];
  const p = state.persons.find((x) => x.id === personId) || null;
  const evs = p ? state.events.filter((e) => e.personId === p.id).sort((a, b) => b.time - a.time) : [];
  const c = {
    name: p ? p.name : "\u670B\u53CB",
    identity: p ? p.identity || "\u670B\u53CB" : "",
    likes: p ? p.likes || "" : "",
    taboos: p ? p.taboos || "" : "",
    eventTitle: evs.length ? evs[0].title || "" : "",
    eventType: evs.length ? evs[0].type || "" : "",
    context: (context || "").trim()
  };
  const texts = sc.build(c);
  const variants = SCRIPT_TONES.map((t) => ({ tone: t.label, id: t.id, text: texts[t.id] }));
  return { scene: sc, person: p, variants };
}

// packages/core/src/ics.ts
function icsEscape(s) {
  return String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}
function icsDate(d) {
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
}
function buildICS(state, now = Date.now()) {
  const out = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EQ-Worker//CN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:EQ-Worker \u91CD\u8981\u65E5\u5B50"
  ];
  const stamp = new Date(now).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const addYearly = (uid2, mmdd2, summary, desc) => {
    const d = nextMMDD(mmdd2, now);
    if (!d) return;
    out.push(
      "BEGIN:VEVENT",
      `UID:${uid2}@eq-worker`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(d)}`,
      "RRULE:FREQ=YEARLY",
      `SUMMARY:${icsEscape(summary)}`,
      `DESCRIPTION:${icsEscape(desc)}`,
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsEscape(summary + " \u63D0\u9192")}`,
      "END:VALARM",
      "END:VEVENT"
    );
  };
  for (const p of state.persons) {
    if (p.birthday) {
      addYearly("birthday-" + p.id, p.birthday, "\u751F\u65E5 \xB7 " + p.name, `EQ-Worker \u751F\u65E5\u63D0\u9192\uFF1A${p.name}${p.likes ? "\uFF0C\u559C\u6B22\uFF1A" + p.likes : ""}`);
    }
    if (p.anniversary) {
      addYearly("anniversary-" + p.id, p.anniversary, "\u7EAA\u5FF5\u65E5 \xB7 " + p.name, `EQ-Worker \u7EAA\u5FF5\u65E5\u63D0\u9192\uFF1A${p.name}`);
    }
  }
  for (const r of state.reminders) {
    if (r.status !== "pending" || !/^\d{4}-\d{2}-\d{2}$/.test(r.date || "")) continue;
    const p = state.persons.find((x) => x.id === r.personId);
    out.push(
      "BEGIN:VEVENT",
      `UID:todo-${r.id}@eq-worker`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${r.date.replace(/-/g, "")}`,
      `SUMMARY:${icsEscape(r.content)}`,
      `DESCRIPTION:${icsEscape("EQ-Worker \u5F85\u529E" + (p ? " \xB7 " + p.name : ""))}`,
      "BEGIN:VALARM",
      "TRIGGER:-P0DT9H",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsEscape(r.content)}`,
      "END:VALARM",
      "END:VEVENT"
    );
  }
  out.push("END:VCALENDAR");
  return out.map((line) => {
    if (line.length <= 74) return line;
    let s = line;
    const chunks = [];
    while (s.length > 74) {
      chunks.push(s.slice(0, 74));
      s = " " + s.slice(74);
    }
    chunks.push(s);
    return chunks.join("\r\n");
  }).join("\r\n");
}
function upcomingDates(state, days, now = Date.now()) {
  const lim = days || 30;
  const out = [];
  for (const p of state.persons) {
    if (p.birthday) {
      const d = daysUntil(p.birthday, now);
      if (d >= 0 && d <= lim) {
        out.push({ kind: "\u751F\u65E5", name: p.name, days: d, personId: p.id, date: p.birthday });
      }
    }
    if (p.anniversary) {
      const d = daysUntil(p.anniversary, now);
      if (d >= 0 && d <= lim) {
        out.push({ kind: "\u7EAA\u5FF5\u65E5", name: p.name, days: d, personId: p.id, date: p.anniversary });
      }
    }
  }
  for (const r of state.reminders) {
    if (r.status !== "pending" || !/^\d{4}-\d{2}-\d{2}$/.test(r.date || "")) continue;
    const t = (/* @__PURE__ */ new Date(r.date + "T00:00:00")).getTime();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const d = Math.round((t - today.getTime()) / DAY);
    if (d >= 0 && d <= lim) {
      const p = state.persons.find((x) => x.id === r.personId);
      out.push({ kind: "\u5F85\u529E", name: r.content, days: d, personId: r.personId, date: r.date, extra: p ? p.name : "" });
    }
  }
  return out.sort((a, b) => a.days - b.days);
}

// packages/core/src/storage/adapter.ts
function createMemoryAdapter(seed = {}) {
  const mem = new Map(Object.entries(seed));
  return {
    kind: "memory",
    getItem(k) {
      return mem.has(k) ? mem.get(k) : null;
    },
    setItem(k, v) {
      mem.set(k, String(v));
      return true;
    },
    removeItem(k) {
      mem.delete(k);
    },
    keys() {
      return Array.from(mem.keys());
    }
  };
}

// packages/core/src/storage/local.ts
function createLocalAdapter(options = {}) {
  var _a;
  const prefix = options.keyPrefix || "";
  const fallback = createMemoryAdapter();
  let storage = (_a = options.storage) != null ? _a : null;
  if (storage === null && typeof localStorage !== "undefined") {
    storage = localStorage;
  }
  let degraded = false;
  const k = (key) => prefix + key;
  return {
    kind: "local",
    get degraded() {
      return degraded;
    },
    getItem(key) {
      if (storage) {
        try {
          const v = storage.getItem(k(key));
          if (v !== null && v !== void 0) return v;
        } catch (e) {
          degraded = true;
        }
      }
      return fallback.getItem(k(key));
    },
    setItem(key, v) {
      fallback.setItem(k(key), v);
      if (storage) {
        try {
          storage.setItem(k(key), v);
          return true;
        } catch (e) {
          degraded = true;
          return false;
        }
      }
      degraded = true;
      return false;
    },
    removeItem(key) {
      fallback.removeItem(k(key));
      if (storage) {
        try {
          storage.removeItem(k(key));
        } catch (e) {
          degraded = true;
        }
      }
    }
  };
}

// packages/core/src/storage/migrate.ts
function isObj2(x) {
  return !!x && typeof x === "object" && !Array.isArray(x);
}
function detectSchema(raw) {
  if (!isObj2(raw)) return 0;
  if (isObj2(raw.meta) && typeof raw.meta.schema === "number") return raw.meta.schema;
  if (typeof raw.schema === "number") return raw.schema;
  return 0;
}
function migrate(raw) {
  const warnings = [];
  const from = detectSchema(raw);
  const to = SCHEMA_VERSION;
  if (!isObj2(raw)) {
    warnings.push("\u6570\u636E\u7ED3\u6784\u65E0\u6CD5\u8BC6\u522B\uFF0C\u5DF2\u6309\u7A7A\u6570\u636E\u521D\u59CB\u5316");
    return { state: createEmptyState(), from, to, warnings };
  }
  if (from > to) {
    warnings.push(`\u6570\u636E\u7248\u672C v${from} \u9AD8\u4E8E\u5F53\u524D v${to}\uFF0C\u5DF2\u6309\u5F53\u524D\u7ED3\u6784\u5C3D\u91CF\u517C\u5BB9\u8BFB\u53D6`);
  } else if (from > 0 && from < to) {
    warnings.push(`\u6570\u636E\u5DF2\u4ECE v${from} \u8FC1\u79FB\u5230 v${to}`);
  } else if (from === 0) {
    warnings.push("\u6570\u636E\u7F3A\u5C11\u7248\u672C\u53F7\uFF0C\u5DF2\u6309\u5F53\u524D\u7ED3\u6784\u517C\u5BB9\u8BFB\u53D6");
  }
  const clean = sanitizeImport(raw);
  warnings.push(...clean.warn);
  const settings = normalizeSettings(clean.settings);
  const meta = { schema: to, updatedAt: Date.now() };
  const state = {
    persons: clean.persons,
    events: clean.events,
    reminders: clean.reminders,
    progress: clean.progress,
    streak: clean.streak,
    settings,
    meta,
    lastEventId: null,
    filter: "",
    identity: "all",
    sortBy: "heat",
    trainDiff: "\u5168\u90E8",
    ledgerFilter: "all"
  };
  return { state, from, to, warnings };
}

// packages/core/src/storage/store.ts
function createStore(adapter) {
  let state = createEmptyState();
  const store = {
    getState() {
      return state;
    },
    load() {
      try {
        let raw = adapter.getItem(DB_KEY);
        let fromLegacyKey = false;
        if (!raw) {
          for (const k of LEGACY_DB_KEYS) {
            const old = adapter.getItem(k);
            if (old) {
              raw = old;
              fromLegacyKey = true;
              break;
            }
          }
        }
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.persons)) {
          return false;
        }
        const migrated = migrate(parsed);
        state = migrated.state;
        if (fromLegacyKey || migrated.from !== SCHEMA_VERSION) store.save();
        return true;
      } catch (e) {
        return false;
      }
    },
    save() {
      try {
        const updatedAt = Date.now();
        state.meta = { schema: SCHEMA_VERSION, updatedAt };
        const body = {
          schema: SCHEMA_VERSION,
          meta: state.meta,
          persons: state.persons,
          events: state.events,
          reminders: state.reminders,
          progress: state.progress,
          streak: state.streak,
          settings: state.settings
        };
        return adapter.setItem(DB_KEY, JSON.stringify(body));
      } catch (e) {
        return false;
      }
    },
    export() {
      return {
        app: "EQ-Worker",
        version: 3,
        schema: SCHEMA_VERSION,
        exportedAt: Date.now(),
        persons: state.persons,
        events: state.events,
        reminders: state.reminders,
        progress: state.progress,
        streak: state.streak,
        settings: { ...state.settings, ai: { ...DEFAULT_AI } },
        meta: state.meta
      };
    },
    exportJSON() {
      return JSON.stringify(store.export(), null, 2);
    },
    importObjects(raw) {
      const warnings = [];
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        warnings.push("\u5BFC\u5165\u5931\u8D25\uFF1A\u6587\u4EF6\u683C\u5F0F\u4E0D\u5BF9");
        return {
          applied: false,
          clean: sanitizeImport({}),
          warnings
        };
      }
      const obj = raw;
      if (!Array.isArray(obj.persons)) {
        warnings.push("\u5BFC\u5165\u5931\u8D25\uFF1A\u6587\u4EF6\u683C\u5F0F\u4E0D\u5BF9\uFF08\u7F3A\u5C11 persons\uFF09");
        return { applied: false, clean: sanitizeImport({}), warnings };
      }
      const clean = sanitizeImport(obj);
      store.applyImport(clean);
      return { applied: true, clean, warnings };
    },
    applyImport(clean) {
      state = {
        ...state,
        persons: clean.persons,
        events: clean.events,
        reminders: clean.reminders,
        progress: clean.progress,
        streak: clean.streak,
        settings: normalizeSettings(clean.settings),
        meta: { schema: SCHEMA_VERSION, updatedAt: Date.now() },
        lastEventId: null,
        filter: "",
        identity: "all",
        sortBy: "heat",
        trainDiff: "\u5168\u90E8"
      };
      store.save();
    },
    setAIKey(key) {
      return adapter.setItem(AI_KEY, String(key));
    },
    getAIKey() {
      return adapter.getItem(AI_KEY);
    },
    clearAIKey() {
      adapter.removeItem(AI_KEY);
    },
    reset() {
      state = createEmptyState();
      return state;
    }
  };
  return store;
}
