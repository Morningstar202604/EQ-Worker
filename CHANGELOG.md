# Changelog

## v3.5.0 — 2026-11-04

把「能跑」推进到「能持续交付」：补齐工程化门禁、性能下限与发布流程。

### 新增：工程质量门禁

- **ESLint 9 + typescript-eslint**：分环境配置（TS 模块 / 微信小程序 CJS / 浏览器脚本 / Service Worker / 构建脚本）。首次运行报 413 条，逐条甄别后修掉 5 个真问题（未使用导入、`==` 隐式转换、`prefer-const`），其余是环境声明噪声。现为 0 错误并纳入 `verify`。
- **覆盖率门槛**（`@vitest/coverage-v8`）：实测 85.4% 语句 / 74% 分支，阈值设为 80/70/80/80，挡住断崖式下滑。
- **性能基准测试**（11 项）：用「数据翻 10 倍、耗时不超过 20 倍」判断复杂度回归，覆盖计算、聚合、导出的 1000 人规模场景。
- **E2E 自动化**（8 项，Playwright + 真实静态服务）：旧版六 Tab、随礼、话术、刷新持久化、移动端 390×844；Studio 五视图、修炼答题、成就 13 个、年度 12 柱、**AI 关闭时零外部请求**。

### 新增：发布流程

- `scripts/release.mjs`：一键构建七套产物 → 生成 SHA-256 校验和 → 输出发布清单。
- 清单里**显式列出「发布前必须人工确认」与「已知未验证项」**，避免把「构建成功」当成「已发布可用」。
- CI 重写为三个 job：`verify`（构建+lint+类型+双测试+产物一致性+密钥扫描+依赖审计）、`e2e`（Ubuntu + Windows 矩阵）、`desktop`（tag 触发，产物可下载）。

### 修复

- **`clamp(NaN)` 返回 `NaN`**：NaN 会沿算术一路传播，把所有关系指标变成「—」。改为退化到下界。
- **`niceAmount(Infinity)` 返回 `Infinity`**：写进金额字段后 JSON 序列化成 `null`，读回来变 0，静默丢数。非有限数归零。
- **年度报告窗口错误**：`yStart` 用「去年同月 1 号」，把第 13 个月也算进来，与 12 个月柱状图对不上。改为「11 个月前 1 号」。
- **事件索引缓存读到脏数据**：初版用「数组引用 + 长度」判断缓存有效性，原地 `push`/`splice` 时判断失效，导致新增往来后指标不变。改为不做跨调用缓存，新增 `computeAll()` 供批量场景只建一次索引。

### 改进

- CLI 从 15 命令扩到 18：新增 `search`（跨字段搜索）、`reminders`（待办列表与完成）、`doctor`（数据体检：孤立记录、重复 id、非法金额、生日格式、未来时间）。
- MCP 从 11 工具扩到 15：新增 `search`、`get_reminders`、`add_reminder`、`get_practice_progress`；资源从 2 个扩到 3 个（新增 `eqworker://reminders`）。
- 本地后台新增「数据体检」视图；`/api/doctor` 接口。
- **重建全部陈旧产物**：APK（11-02 的旧包）、Windows 安装包（早于最终构建），并逐包验证内嵌版本号。

### 质量

- **508 个测试**：190 个 `node --test` + 318 个 Vitest（30 文件）。
- `pnpm run verify` 退出码 0，链路：版本一致性 → 七套构建 → lint → 190 测试 → tsc → 318 测试（含覆盖率门槛）→ 双 Vite 构建。
- 新增 52 个测试：性能 11、边界 26、E2E 8、CLI 新增 3、MCP 新增 5、后台新增 1。
- 边界测试覆盖空值、超长字符串、非法日期、闰日、负数金额、原型污染、重复 id、跨年窗口、UID 碰撞。
- 未验证：小程序真机、APK 正式签名、安装包代码签名、MCP 在真实桌面客户端中的端到端表现。

## v3.4.0 — 2026-11-04

从「一个应用」扩成「一个平台」：同一个引擎，五个入口，外加协议级集成。

### 新增：CLI（`apps/cli`）

15 个命令覆盖查看、参谋、写入、数据四条线：`overview` / `persons` / `person` / `ledger` /
`gift` / `script` / `health` / `practice` / `achievements` / `report` / `actions` /
`add-person` / `record` / `export` / `import` / `where` / `demo`。全部支持 `--json`。

零运行时依赖，`esbuild` 打成单文件 `dist-cli/eqw.mjs`。数据目录遵循各平台惯例
（Windows `%APPDATA%`、macOS `Application Support`、Linux `XDG_DATA_HOME`），
可用 `--data` 或 `EQWORKER_DATA_DIR` 覆盖。

### 新增：本地 Web 后台（`apps/server`）

概览 / 人脉 / 账本 / 体检 / 参谋五个视图。**只绑 127.0.0.1**；除 `/api/health` 外全部接口
要求 `Authorization: Bearer <token>`，令牌首次启动随机生成并打印在终端。静态资源做了目录
穿越防护。零前端框架——六个视图不值得引入 React 的产物体积与构建链。

### 新增：MCP 服务器（`apps/mcp`）

基于官方 `@modelcontextprotocol/sdk` 1.32.2。供 Claude Desktop / Cursor / Cline 等直接读写
本地人情数据（stdio 传输，无网络出站）。

- **11 个工具**：9 个只读（总览、人脉、单人、账本、体检、随礼、话术、成就、年度）+ 2 个写入
  （记一笔、加人脉）。
- **2 个资源**：`eqworker://persons`、`eqworker://ledger`，可被客户端当上下文引用。
- **2 个提示**：`weekly_review`（每周人情复盘）、`gift_decision`（随礼决策）。
- 写工具按 MCP 规范声明 `readOnlyHint: false`，宿主据此先向用户确认；工具输出结构恒定
  （空库也返回 `{总数:0, 人脉:[]}`），宿主可统一解析。

### 新增：`packages/node`

文件存储适配器，与 core 的 `StorageAdapter` 同接口，因此迁移、导入导出、写保护逻辑在三端
复用同一份实现。**原子写**（写临时文件后 rename），断电不会留下半个文件。损坏的数据文件
拒绝读取而不是当成空数据覆盖。

放在独立包而非 core，是因为 core 要进浏览器与小程序，不能出现 `node:fs`——这条边界由构建
强制：`vite build` 遇到 `node:fs` 会直接失败。

### 新增：Windows 安装包

改用 `electron-builder` 产出 NSIS `setup.exe`（116 MB）：开始菜单项、桌面快捷方式、卸载项、
可选安装目录、`versionCode` 与产品名写入 PE 资源。此前的手工 zip 无法写 exe 图标与版本资源。
另生成多尺寸 `.ico`（`scripts/make-ico.mjs`，PNG-in-ICO，不引图像库）。

### 修复

- **新用户走「我自己来」后演示数据入口消失**：人脉页空态只提供「添加第一个人」。补上演示入口，
  并加 2 个回归测试。
- **CLI 文件存储漏调 `store.load()`**：每次启动都是空库，写回时会把磁盘上真实数据覆盖掉。
  这类「看起来能跑但会毁数据」的缺陷比崩溃更危险。已修，并由 `tests/cli.test.mjs` 的
  「demo 写入后能读回」「损坏文件原样保留」两个用例锁死。
- **后台把内部错误原文返回客户端**：Node 的 fs 错误带绝对路径，属本机信息。改为只回通用文案，
  详情写服务端日志。
- **CLI `persons --json` 与表格列不对应**：JSON 是 `computed.heat` 两层嵌套，脚本要钻两层；
  改为扁平结构，字段与表格列一一对应。
- **MCP `list_persons` 空库返回纯文本**：输出类型不固定会让宿主解析失败。改为恒定返回 JSON。
- **三个新端版本号硬编码**：纳入 `sync-version` 校验，发版时不会再出现「主版本已升、CLI 还报旧号」。

### 改进

- parity 测试从 14 个函数扩到 16 个（补 `achievements` / `monthInsights`），仍为 6 组 fixture 全覆盖。
- `pnpm run verify` 现在同时构建 CLI / 后台 / MCP，打包配置错误在门禁阶段就会暴露。
- README 中英双语重写：以截图与对照表为主，讲清「解决什么」而不是罗列技术栈。

### 质量

- **454 个测试**：173 个 `node --test` + 281 个 Vitest（28 文件），`tsc --noEmit` 无错误。
- 新增 42 个测试专测三个新端：CLI 13（真实子进程）、后台 16（真实 HTTP socket）、MCP 13（官方
  SDK 真实 JSON-RPC 往返）。
- 功能真实性核查 23/23：见 [`docs/AUDIT.md`](docs/AUDIT.md)。
- Windows 安装包实测启动，窗口标题 `EQ-Worker · 人情世故助手`，无残留进程。
- 依赖审计（官方源）：无已知漏洞。
- 未验证：小程序真机、安卓 APK 本轮未重建、MCP 在真实 Claude Desktop 中的端到端表现
  （仅用官方 SDK 客户端验证了协议层）。

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
