# 功能真实性核查报告

> 核查日期：2026-11-07 · 触发：ZCode 会话在 15:03 的指令「先验证一下，确定没问题才能继续往下做……把所有我们做的功能全部验证真实性与是否融入了主线？」因额度耗尽中断，本报告接续完成。
>
> 方法：源码计数、静态接线扫描、产物实跑（CLI / MCP / SDK）、全量 verify、五平台远端一致性核对。**不是只读代码就下结论**。

## 结论

**不能判定「没问题」。** 功能本身全部真实可用，无任何占位实现、假按钮或静默失败；但发现 **1 个需要你定方向的边界问题（P0）**：v3.8 / v3.9 新增的 AI 能力没有进入用户实际使用的主应用。按「确定没问题才能继续往下做」的要求，本轮到此为止，不继续叠加新功能。

另有 8 处「声称与实现不一致」已当场修复，并加了自动化门禁防止回归。

---

## 一、逐项真实性核查

| # | 能力 | 实现位置 | 主线接线 | 测试 / 实跑 | 结论 |
|---|---|---|---|---|---|
| 1 | 随礼三档 + 白事单数分轨 | `core/engine.ts` | 主应用 / Studio / CLI / MCP / server / 小程序 / SDK | SDK 实跑 `giftAdvice(白事)` → 201 / 301 / 501 全单数 | ✅ |
| 2 | 送礼避雷、场合礼俗 | `core/etiquette.ts` | 主应用 + SDK | `etiquette.test.ts` | ✅ |
| 3 | 人情账本（送礼/收礼/借款分账） | `core/ledger.ts` | 全端 | `ledger.test.ts` + server E2E | ✅ |
| 4 | 话术参谋 | `core/scripts.ts`，**18** 场景 × 3 语气 | CLI / MCP / server / 主应用 | `e2e.test.mjs` 拒绝借款话术 | ✅（数量已对齐，见问题 1） |
| 5 | 关系体检 / 今日行动 / 年度报告 | `core/health.ts` `actions.ts` | 全端 | 对应单测 + E2E | ✅ |
| 6 | 题库 25 题、成就徽章、修炼 | `core/constants.ts` `practice.ts` | 主应用玩法页 / Studio | `achievements.test.ts` | ✅ |
| 7 | 农历节日 1900–2100 / ICS 导出 | `core/date.ts` `ics.ts` | 主应用 / SDK | `date.test.ts` | ✅ |
| 8 | 存储加固、导入全有或全无 | `core/storage/*` `sanitize.ts` | 全端 | `storage-safety.test.ts` 等 | ✅ |
| 9 | **AI 4 流水线 / 8 只读工具 / 免费搜索 / 礼俗知识库** | `packages/ai` `core/knowledge.ts` | **仅 Studio + SDK（+ CLI/MCP 侧导出）** | `tools.test.ts` `free-search.test.ts` 等；`apps/studio/assistant.ts:323` 真实调用 `freeSearch`、`:349` 真实调用 `runTool` | ⚠️ **见 P0** |
| 10 | CLI 命令集 | `apps/cli` | — | 实跑 `eqw --version` / `--help` → v3.9.0，命令表完整 | ✅ |
| 11 | MCP **15** 工具 / 资源 / 提示 | `apps/mcp` | — | 实跑 `initialize` + `tools/list` 返回 15 个真实 schema；`write_script` 描述现输出「18 个常见场景」 | ✅ |
| 12 | 本地后台 Web API | `apps/server` | — | verify 中 16 项 server 测试（含目录穿越阻断） | ✅ |
| 13 | 开放 SDK | `scripts/build-sdk.mjs` | — | 实跑 ESM import → **89** 项导出，零依赖 | ✅ |
| 14 | 微信小程序 | `EQ-Worker-小程序/` | core.bundle 含 `knowledge.ts` 导出 | 页面层无 AI / 知识库 UI；`mini-*.test.mjs` 覆盖数据与参谋 | ✅（与 P0 同边界） |
| 15 | 官网 | `官网/EQ-Worker官网.html` | 非 Pages 部署源（Pages 指向根 `index.html`） | 数字已修正；**版本历程仍停在 v3.5** | ⚠️ 已知，未纳入本轮 |

**关键事实**：`_app_dev.js`（单文件主应用，网页版 / 安卓 APK / Windows exe 共用）中不存在 `freeSearch` / `runTool` / `runAssistant` / 知识库任何入口，全文中「助手」均由**本机规则**生成，且明确写着「所有建议由本地规则生成，不调用外部 AI」。`ARCHITECTURE.md` 也界定 Studio 是「第二套 UI，不属于 legacy 发布产物」。因此 README 原先笼统宣传的「AI 与联网的真实边界」对下载安装包的用户并不成立。

---

## 二、发现并修复的问题

| # | 问题 | 修复 |
|---|---|---|
| 1 | README 中英版称 **20** 个话术场景，实际 `SCRIPT_SCENES` 只有 **18** 个；官网写 16，MCP 工具描述写 16 | 全部改为 18；MCP 描述改为 `${SCRIPT_SCENES.length}` 动态生成 |
| 2 | Windows 下载名硬编码 `EQ-Worker-3.6.0-x64.exe`，实际 v3.9.0 | 两版 README 改为 `3.9.0` |
| 3 | **英文版** `README.md` 的功能表、截图说明、安装表、结尾共 19 行中文，违反「对外介绍不混用语言」 | 全部改写为规范英文 |
| 4 | AI 能力适用范围未说明，读者会误以为主应用也有 | 中英双版补 **Scope / 适用范围**：仅 Studio、CLI/MCP、SDK 提供；主应用与小程序完全本地、无 AI、无网络请求 |
| 5 | `docs/AUDIT.md` 还是 11-04 的旧报告（只覆盖 23 项旧功能，且两项「发现并修复的问题」状态仍为「待修」） | 由本报告替换 |
| 6 | 官网首屏统计与中英文案写 16 个场景 | 三处改为 18（仅数字，历程未动） |
| 7 | 无自动化手段阻止数字/版本再次漂移 | 新增 `tests/claims.test.mjs`，把文档数字锚定到源码与 `package.json` |
| 8 | 徽章测试数未随新增测试更新 | 623 → **624** |

---

## 三、P0：需要你定方向

**问题**：v3.8 / v3.9 交付的 AI 工具调用、免费联网搜索、礼俗知识库，目前只有 Studio（第二套 UI）和 SDK/CLI/MCP 侧能用到；占绝大多数的网页版 / APK / exe 用户完全接触不到。这是「是否融入主线」的唯一未达标项。

| 方案 | 内容 | 代价 / 影响 |
|---|---|---|
| **A. 接进主应用** | 在 `_app_dev.js` 增加 AI 设置、Key 管理、发送前预览、联网开关与隐私提示，并把 `runAssistant` 接进单文件构建 | 工作量大；必须同时守住「默认零网络请求」红线与姓名脱敏；会改变 legacy 单文件的定位 |
| **B. 明确产品边界**（本轮已做一半） | 承认 Studio 是 AI 能力的载体，主应用保持纯本地；文档写清边界 | 成本最低，已通过 README 中英双版落地；但 v3.8/v3.9 的宣传口径需要相应收敛 |

本轮按 B 落地了**如实标注**，没有擅自改动主应用架构。请确认选 A 还是 B，再继续往下做。

---

## 四、验证证据

- `pnpm run verify` → **EXIT=0**：36 个 Vitest 文件 / 431 用例全绿，193 个 Node 测试全绿，合计 **624**；含 ESLint、`tsc --noEmit`、双 Vite 构建、SDK/MCP/CLI/server/小程序核心构建与 E2E 真实浏览器用例。
- 产物实跑：CLI `v3.9.0`；MCP `initialize` + `tools/list` 返回真实工具 schema；SDK 89 导出 + `giftAdvice` 白事三档。
- 发布链路（本轮改动前已核对）：本地与 5 个远端树哈希一致 `f72938fe`，v3.9.0 tag、三仓 Release 各 9 个资产、CI 五 job 与 Pages 全绿。
- 自动化门禁：`tests/claims.test.mjs` 断言场景数、版本号、MCP 描述来源、AI 边界说明、主应用无 AI、英文版语言纯度；任何一处漂移，verify 立即变红。

> 本轮修复**尚未提交或推送**。按「做完再上传、不要频繁上传」的约定，等 P0 方向确认后与后续改动一并提交。

---

## 五、交付级深挖（2026-11-07 下午，接"一次性完结"指令）

对常驻进程的写路径做了定向审查，发现并修复 4 处真实缺陷（均已带回归测试）：

| # | 缺陷 | 影响 | 修复 |
|---|------|------|------|
| 1 | server `DELETE /api/events` 保存失败不回滚内存 | 常驻进程里删除报 500 后记录"接口消失、磁盘还在"，重启复活，账本数字来回跳 | 失败时恢复原数组引用，与 POST 路径同标准 |
| 2 | MCP `add_person` / `record_event` / `add_reminder` 保存失败不回滚 | 报"用户的记录没有被修改"是假话，内存已污染，后续读取可见未落盘数据 | 先构造新数组、失败回滚引用 |
| 3 | MCP 标签裁剪 12 / CLI 不裁剪，核心规范是 10 | 11 个标签的合法输入必然保存失败，报误导性"存储不可写" | 统一 `slice(0, 10)` |
| 4 | ci.yml 引用不存在的 `release/RELEASE-3.5.0.md` | 回退创建 Release 时失败 | 改用 `--notes`，与 Android 任务一致 |

交付缺口补齐：`.github/dependabot.yml`（npm + actions 周更）；ROADMAP 勾选框同步到仓库真实状态（issue/PR 模板、SUPPORT、ADR、E2E 入 CI 等实际早已完成但从未勾选）。

仍开放的项（都需要用户侧资源，无法由代码补齐）：
- 正式发布签名：需要用户提供的 keystore / GPG key（ROADMAP 3.4）
- 小程序真机测试：需要真机
- CSV 导入、关系图谱、无障碍 WCAG AA：4.0 方向，见 ROADMAP

回归测试手法说明：强制落盘失败采用「把数据文件替换成同名目录」——`rename(tmp → 目录)` 在 Windows 与 Linux 上都必然失败，测试在双平台稳定。
