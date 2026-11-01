# @eq-worker/core

EQ-Worker 的纯逻辑内核。从 `_app_dev.js`（Web/Android/桌面三端唯一事实源）按语义逐字抽取，供 Web / Android / 桌面 / 小程序复用。

约束：

- 所有函数显式接收 `state`，不读取 DOM、不访问全局状态；
- 时间相关函数接受可选 `now: number`，便于测试；
- `_app_dev.js` 保持原样，作为回滚基线与 parity 对照事实源。

## 模块

| 文件 | 内容 |
| --- | --- |
| `src/types.ts` | Person / PersonalEvent / Reminder / Settings / AppState / ComputedPerson / Ledger 等 |
| `src/constants.ts` | EVENT_TYPES、OCCASIONS、GIFT_TIERS、CITY_TIERS、GIFT_BASE、LEDGER_STATUS、NICE_AMOUNTS、LEVELS、DIFFS、IDENTITIES、SCENARIOS |
| `src/date.ts` | DAY、fmtDate、todayStr、toMMDD、toDateInput、daysUntil、nextMMDD、solarToLunar、upcomingFestival |
| `src/sanitize.ts` | sanitizeImport（外部 JSON 清洗）、createEmptyState、normalizeSettings |
| `src/engine.ts` | computePerson、computedFor、overallMetrics、getWisdom、getLevel、buildAlerts、getSuggestion、relationRead |
| `src/ledger.ts` | eventDir、personLedger、ledgerTotals、ledgerInsights、settlePrefill、niceAmount、giftAdvice、fmtMoney |
| `src/health.ts` | personHealth、healthRanking |
| `src/actions.ts` | buildActions |
| `src/scripts.ts` | SCRIPT_TONES、SCRIPT_SCENES、buildScripts |
| `src/ics.ts` | buildICS、upcomingDates |
| `src/storage/*` | StorageAdapter、内存/本地适配器、v4→v5 迁移、store |

## 存储

- `DB_KEY` 固定为 `eqworker_db_v1`（历史兼容）；`SCHEMA_VERSION` 为 5。
- v4 数据（含旧 `rqsg_radar_v2` key）由 `migrate()` 无损迁移到 v5，缺字段补默认值，脏数据统一走 `sanitizeImport`。
- `settings` 新增 `ai: { enabled, providerId, model, baseUrl, temperature }`，默认关闭；顶层新增 `meta: { schema, updatedAt }`。

### AI Key 的安全边界

`createStore(adapter).setAIKey()` 把密钥写入独立 key `eqworker_ai_key_v1`，**只适用于桌面/网页本地运行**：

- 该 key 是 localStorage 明文，任何同源脚本（XSS、第三方依赖、浏览器扩展）都能读取；
- 因此它不进入 `export()` / 导出 JSON / 备份文件，也不会写入 `settings.ai`；
- 生产环境请改用系统凭据库（Windows Credential Manager / macOS Keychain / Android Keystore），不要把长期密钥存进浏览器；
- `clearAIKey()` 用于注销时立即清除。

## 测试

```bash
pnpm exec vitest run packages/core
```

其中 `tests/engine.parity.test.ts` 用 `vm` 加载原始 `_app_dev.js`（最小浏览器桩），逐函数对照 core 输出，数值容差 1e-9。
