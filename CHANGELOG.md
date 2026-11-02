# Changelog

## v3.3.0 — 2026-11-03

把「能算」补齐到「能练、能看长线」：成就、修炼计分与年度回顾下沉到 core，三端共用同一份规则。

### 新增

- **`packages/core/src/achievements.ts`**：`achievements()`（13 个徽章，全部由当前数据实时推导，不新增持久化字段）、`monthInsights()`（本月往来、走动最勤、新增人脉、人情债前三）、`annualReport()`（近 12 个月滚动窗口、最常走动、年度关键词）。
- **`packages/core/src/practice.ts`**：`recordPractice()` / `commitPractice()` / `todayScenario()`，把修炼计分、难度加成与连续打卡从 UI 内联逻辑抽成纯函数；`commitPractice` 返回新 state，不修改入参。
- **Studio 修炼页**（导航由 4 项增至 5 项）：今日情景、情景库、难度筛选、答题点评与人情点拨、连续修炼天数。
- **Studio 成就徽章与近 12 个月回顾**：并入账本与洞察页。
- **小程序随礼参谋**（`pages/gift/`）：按关系、场合、档位、城市给出三档金额与计算依据。
- **小程序话术参谋**（`pages/script/`）：覆盖全部场景，三种语气，可一键复制，支持指定对象与补充背景。

### 修复

- **`Store` 缺少 `setState()`**：Studio 采用纯函数式更新（`commitPractice` 返回新对象并替换 `StudioStore.appState`），但 `store.save()` 序列化的始终是内部闭包状态，导致**修炼成绩刷新即丢失**。新增 `Store.setState(next)` 并在写入后同步；保存失败时回滚内存状态并明确提示。补 2 个回归测试锁死该行为。
- **小程序 `engine` 未导出 `fmtMoney`**：随礼参谋调用即抛 `TypeError`。补导出 `fmtMoney` / `ledgerNetLabel` / `ledgerNetShort`。
- **小程序 `engine` 未导出 `SCRIPT_SCENES`**：话术参谋无法枚举场景。补导出。

### 改进

- 小程序「我的」页新增「人情参谋」区块，直通随礼与话术参谋。
- README 增加三端能力对照表（中英双语）。

### 质量

- 单元测试 408 个（127 legacy `node --test` + 281 Vitest / 28 文件），`tsc --noEmit` 无错误。
- 变异反证：把 `achievements()` 的 `done` 改成恒 `true`，5 个测试变红；恢复后全绿。
- 浏览器 E2E 13 项全过（Edge + Playwright）：Studio 五项导航、修炼页渲染、答题出结果、**刷新后智慧值保留（2 → 2）**、13 个徽章、12 根年度柱、移动端 390×844；legacy 六个 Tab 可切换；两端零控制台错误。
- 四份 `index.html` 产物 sha256 完全一致。
- 未验证：小程序未做真机调试（仅用 vm 模拟 `wx` 环境验证页面逻辑）；安卓 APK 与 Windows 包未重建（本轮未改原生壳）。

## v3.2.0 — 2026-10-31

把「能跑」推进到「可维护」：工程化地基、三包分层与多端收口。

### 新增

- **工程化地基**：Vite + TypeScript + Vitest 双链路，`node --test` 旧链路与 Vitest 新链路并行门禁。
- **`packages/core`**：纯逻辑引擎（类型、常量、日期、清洗、账本、健康度、行动、话术、ICS、存储），与 legacy `_app_dev.js` 逐函数 parity。
- **`packages/viz`**：零依赖确定性 SVG 图表（雷达、网络、趋势、流向、仪表盘）。
- **`packages/ai`**：本地优先 AI 编排骨架，默认关闭、端侧直连、用户自备 Key、发送前预览。
- **`apps/studio`**：基于 core / viz / ai 的新界面，由 `vite.studio.config.ts` 构建到 `dist-studio/`。
- **小程序共用 core**：新增 `scripts/build-mini-core.mjs` 将 `packages/core` 打包为 `EQ-Worker-小程序/utils/core.bundle.js`，`utils/engine.js` 改为复用 bundle，消除双事实源；新增 `tests/mini-core-parity.test.mjs` 三组以上 fixture 对照验证。
- **安卓 debug dev-server**：debug 包读取 `assets/dev-server.txt` 直连 Vite，release 始终走 assets；开启 WebView 数据库与 `setWebContentsDebuggingEnabled(DEBUG)`。
- **桌面开发模式**：支持 `EQ_DEV_URL` 加载 dev-server 并自动打开 DevTools；权限请求一律拒绝，仅保留剪贴板写权限。

### 改进

- 版本号改为**单一来源**：`package.json` 为唯一手写处，`scripts/sync-version.mjs` 派生并校验安卓 `versionCode`/`versionName`、桌面、三份 `sw.js` 缓存名与小程序关于页；`verify` 第一步即执行校验。同步修正两处历史漂移：网页头部停留在 `v3.1.0`（应为 `v3.2.0`）；安卓 `versionCode` 误写 `312`，按历史规则 `major*100+minor*10+patch`（2.8.1→281、3.0.0→300、3.1.0→310）应为 `320`，且 `320 > 312`，已装设备可正常覆盖升级。
- `verify` 在 legacy build 后自动重建小程序 core bundle，再跑测试与双 Vite 构建。
- README 重写为英文主文档（`README.md`）加中文译本（`README.zh.md`），截图按 v3.2.0 实际界面全部重拍。
- 补齐开源项目管理：`ROADMAP.md`、`CONTRIBUTING.md`、`ARCHITECTURE.md`、`SUPPORT.md`、`CODE_OF_CONDUCT.md`、Issue 表单与 PR 模板、`docs/adr/` 五篇决策记录、`docs/RELEASE.md`、`docs/ai-privacy.md`；`SECURITY.md` 重写，修正原先「数据永不离开设备」与可选 AI 外发相矛盾的表述。
- 代码分层修正：`apps/studio/ui/` 更名为 `apps/studio/pages/`（页面数据组装），与 `views/`（纯渲染）职责分离；删除 `views/html.ts` 中未被引用的 `shortDate`；`overview.ts` 内联的百分比收敛逻辑改为复用 `clampPercent`。

### 质量

- 单元测试 255 个（legacy `node --test` + Vitest），`tsc --noEmit` 无错误。
- 浏览器实跑（Edge + Playwright，1280×633 与 390×844）：旧版客户端 13 步全流程通过——演示数据加载、六个 Tab、人物详情、随礼参谋、话术参谋、记录表单、刷新后持久化（6 位人脉保持不变）、移动端，零控制台报错；Studio 四视图（仪表盘 / 人脉 / 账本与洞察 / AI）渲染正常。
- 未验证：安卓 APK 与 Windows 包本轮未重新构建（未改动原生壳代码），微信小程序未做真机测试。

## v3.1.0 — 2026-10-28

把「知道欠谁」推进到「今天就能结清」。

### 新增

- **一键结清**：账本净额可直接转成还款 / 回礼 / 收款 / 对方回礼记录，金额可改小，支持部分结清。
- **账本洞察**：本月送出、本月收到、平均每笔送出、最花心思的场合。
- **关系体检总览**：按健康度从低到高排序，先修最需要经营的关系。
- **人物详情结清入口**：人物账本卡直接结清，不用先跳总账。

### 改进

- 弹层增加 Tab 焦点圈定，关闭后焦点回到触发按钮。
- 桌面端弹层宽度、移动端六 Tab、金额格式与统计口径修正。
- 单元测试增至 54 个，覆盖结清预填、账本洞察与健康度排序。

## v3.0.0 — 2026-10-24

从「人情世故雷达」升级为 **EQ-Worker 人情世故助手**，重点解决「记不住、算不清、开不了口」。

### 新增

- **助手首页 / 今日行动**：生日、纪念日、待办、断联、欠人情、账本净额、道谢、关键关系维护统一排序，每条行动带下一步按钮。
- **人情账本**：金额、方向（对方给我 / 我给对方）、场合；单人净额「我欠 / 应收 / 两清」；总账统计、筛选、CSV 导出。
- **随礼参谋**：关系 × 场合 × 档位 × 城市，给出从简 / 建议 / 重视三档，并参考历史同类往来金额与账本净欠。
- **话术参谋**：16 个场景 × 稳妥 / 亲近 / 简短三版，自动带入称呼、身份与最近往来，一键复制。
- **关系体检**：热度、信任、亲密度、活跃度、互惠度、冲突次数合成健康度与建议。
- **重要日子**：生日 / 纪念日按年循环，待办单次，支持 `.ics` 导出。
- **人物资料扩展**：纪念日、喜好、忌讳；人物详情新增账本与健康度。
- **旧数据迁移**：`rqsg_radar_v2` → `eqworker_db_v1`，schema v3 → v4。

### 改进

- 金额只进入账本，不影响热度 / 信任 / 人情债，避免「钱」和「情」互相污染。
- 快速记录表单增加金额、方向、场合；时间线展示金额。
- CSV 导出扩展为人脉 + 账本，并保留公式注入防护。
- 桌面端弹层最大宽度与正文对齐（760px）。
- 小程序引擎升级到 schema v4，保留金额与喜好字段，旧缓存自动迁移。

### 质量

- 单元测试从 35 增至 49，覆盖账本、随礼、行动引擎、话术、ICS、数据清洗。
- 构建产物、安卓 assets、桌面 sw 自动同步。
- 浏览器实跑：助手、账本、随礼、话术、快速记录全流程零控制台报错。

## v2.8.1 — 2026-09-24

- 修复小程序引擎漂移与导入清洗等 10 项缺陷。
- 五维雷达、15 个情景、年度报告、关系网络、成就体系。
- 网页 PWA / 安卓 / Windows / 微信小程序四端同构。

## v2.0 — 2026-08

- 从 81 题社交智力测验重构为人脉经营工具：记录往来 → 自动画像 → 智能提醒 → 情景修炼 → 年度报告。
