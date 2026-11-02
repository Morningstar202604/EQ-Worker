<div align="center">

# EQ-Worker

**人情世故助手 — 把人情顾好，不用靠记性。**

今日行动 · 人情账本 · 随礼参谋 · 话术参谋 · 关系体检

本地优先 · 旧版规则参谋 · 独立 Studio 可选 AI

<a href="README.zh.md"><b>简体中文</b></a> · <a href="README.md">English</a>

[![版本](https://img.shields.io/badge/%E7%89%88%E6%9C%AC-v3.2.0-orange)](https://gitcode.com/badhope/EQ-Worker)
[![许可](https://img.shields.io/badge/%E8%AE%B8%E5%8F%AF-CC%20BY--NC%204.0-red)](LICENSE)

**在线体验：** [X33834](https://x33834.github.io/EQ-Worker/) · [badhope](https://badhope.github.io/EQ-Worker/) · [Morningstar202604](https://morningstar202604.github.io/EQ-Worker/)

**仓库：** [GitCode](https://gitcode.com/badhope/EQ-Worker) · [Gitee](https://gitee.com/badhope/EQ-Worker) · [GitHub @badhope](https://github.com/badhope/EQ-Worker) · [GitHub @X33834](https://github.com/X33834/EQ-Worker) · [GitHub @Morningstar202604](https://github.com/Morningstar202604/EQ-Worker)

</div>

---

## 这是什么

大多数人不是不会处关系，而是**记不住、算不清、开不了口**：

- 谁帮过你、你欠谁一顿饭，散场就忘；
- 婚礼、满月、乔迁、探病，到底随多少才不失礼；
- 想拒绝借钱、想催还、想道歉，话到嘴边又咽回去。

EQ-Worker 把这些事收进一个**本地优先的人情工作台**：每天打开先告诉你「今天该做什么」，再给你账本、礼金区间和能直接复制的话术。

> 它不是一个更复杂的通讯录，而是一个**替你把人情想到前面**的助手。

---

## 旧版客户端功能

以下功能和截图描述旧版网页客户端，安卓和桌面版也使用该客户端。Studio 与小程序界面独立，功能不完全相同。

- **今日行动**：按紧急度汇总重要日子、待办、人情往来和关系维护，并提供相应操作。
- **人情账本**：记录送礼、收礼、借款和还款，查看单人净额、总账与洞察；支持部分结清、筛选及 CSV 导出。金额只进账本，不影响热度、信任和人情债等分数。
- **随礼参谋**：根据关系、场合、档位、城市和历史往来，给出从简、建议、重视三档金额参考；喜好和忌讳仅用于礼物选择提示，不影响金额。礼金仍需结合当地习俗和实际关系决定。
- **话术参谋**：覆盖 16 个常见场景，提供稳妥、亲近、简短三种语气，带入称呼；部分话术还会参考最近往来，可复制后调整。
- **关系体检**：根据关系指标、账本互惠度和近一年冲突计算健康度，提供建议及排序列表。
- **重要日子**：生日和纪念日按年循环，待办为单次事件；支持导出 `.ics`。
- **其他**：人脉画像、快速记录与撤销、搜索与筛选、情景修炼、月度洞察、年度报告、关系网络、成就和 PWA 离线支持。

---

## 截图

| 助手首页 | 人情账本 |
| --- | --- |
| ![助手](docs/screenshots/v3/01-assistant.png) | ![账本](docs/screenshots/v3/02-ledger.png) |

| 随礼参谋 | 话术参谋 |
| --- | --- |
| ![随礼](docs/screenshots/v3/03-gift.png) | ![话术](docs/screenshots/v3/04-script.png) |

| 快速记录 | 移动端 |
| --- | --- |
| ![记录](docs/screenshots/v3/05-record.png) | ![移动端](docs/screenshots/v3/06-mobile.png) |

| 账本洞察 | 一键结清 |
| --- | --- |
| ![账本洞察](docs/screenshots/v3/07-ledger-insights.png) | ![结清](docs/screenshots/v3/08-settlement.png) |

| 结清记录 | 关系体检 |
| --- | --- |
| ![结清记录](docs/screenshots/v3/09-settlement-record.png) | ![关系体检](docs/screenshots/v3/10-health.png) |

| Studio 工作台 | Studio AI（默认关闭） |
| --- | --- |
| ![Studio](docs/screenshots/v3/11-studio-overview.png) | ![Studio AI](docs/screenshots/v3/12-studio-ai.png) |

---

## 新架构（v3.2.0）

仓库现在有两条构建链与三个可复用包：

| 路径 | 作用 |
| --- | --- |
| `packages/core` | TypeScript 纯逻辑引擎（类型、常量、日期、清洗、账本、健康度、行动、话术、ICS、存储），部分核心函数与旧版 `_app_dev.js` 经一致性测试 |
| `packages/viz` | 零依赖确定性 SVG 图表（雷达、关系网络、趋势、流向、仪表盘） |
| `packages/ai` | 可选 AI 编排，支持模拟和外部提供商 |
| `apps/studio` | 独立界面，由 `vite.studio.config.ts` 构建到 `dist-studio/` |

- **旧链路（保持可用）**：`node build.js` 把 `_app_dev.js` + `index.template.html` 编译成 `index.html` / `EQ-Worker.html`，强制同步 Android assets 与 `desktop/`，结尾做一致性校验。旧版发布包不包含单独构建的 Studio。
- **TypeScript 链路**：`pnpm run typecheck`、`pnpm run test:vite`、`pnpm run build:vite`、`pnpm run build:studio`。
- **小程序**：`node scripts/build-mini-core.mjs` 把 `packages/core` 打包成 `EQ-Worker-小程序/utils/core.bundle.js`，`utils/engine.js` 改为 re-export，不再保留重复引擎实现。
- **Studio AI**：默认关闭；启用后默认选中模拟模式，返回预设内容，不调用外部模型。使用真实提供商须关闭模拟模式并自行配置；发送前需确认预览，调用失败时回退本地规则。旧版客户端使用规则参谋。

---

## 客户端说明

| 端 | 状态 | 说明 |
| --- | --- | --- |
| **旧版网页（PWA）** | 完整功能 | HTML 客户端，支持离线 |
| **安卓 App** | 旧版客户端 | WebView 壳，内嵌 `index.html` |
| **Windows 桌面版** | 旧版客户端 | Electron 免安装包 |
| **Studio** | 独立构建 | 总览、人脉、账本及可选 AI；不包含在旧版发布包中 |
| **微信小程序** | 轻量版 | 雷达、人脉、记录、修炼、我的；不含旧版助手/参谋界面 |

> legacy 网页、安卓、桌面共用同一份构建产物；Studio 单独构建，小程序作为轻量随身端保留。

---

## 数据与隐私

- 数据默认存储在本机（`localStorage` / WebView 存储 / `wx.storage`），无账号、无服务器、无埋点。Studio 使用独立存储前缀，不与旧版客户端自动共享数据。网页支持 JSON 备份导入、导出；小程序通过剪贴板复制备份、粘贴导入。备份含个人信息，请妥善保管。
- 旧版网页在 `eqworker_db_v1` 键不存在或其原始存储字符串为空、且同一浏览器存储中有 `rqsg_radar_v2` 时，会尝试读取并迁移旧数据；联系人列表为空本身不会触发迁移。
- **存储异常时宁可拒绝写入，也不覆盖**：若某次迁移会丢失字段，应用进入写保护只读状态并明确提示，而不是悄悄改写；保存失败会告知用户，不会假装成功。详见 [`docs/adr/0005-storage-write-protection.md`](docs/adr/0005-storage-write-protection.md)。
- Studio AI 默认关闭，关闭时**不发任何网络请求**（有测试断言）。启用后须先生成预览并确认，才会把预览中显示的内容发送给你配置的服务商；更换对象、上下文、服务商或模型都会使该确认失效。密钥仅存于 `sessionStorage`，不写入备份与导出。
- 真实服务不可用或调用失败时，Studio 回退本地规则并标注来源；不会静默重试。
- 需要说明的边界：请求一旦发出无法撤回；自定义服务商的实际去向无法验证。准确表述是「默认本地，仅在用户主动发送时外发」，而不是「数据永不离开设备」。详见 [`docs/ai-privacy.md`](docs/ai-privacy.md)。

---

## 快速开始

### 网页

直接打开 `EQ-Worker.html`，或启动本地静态服务。页面会向 `miaoda.feishu.cn` 请求外部字体样式，字体不可用时可能使用备用字体。使用 PWA 离线功能时，请通过 HTTP(S) 提供页面，并将 `index.html`、`EQ-Worker.html`、`sw-register.js` 和 `sw.js` 放在一起；Service Worker 还取决于浏览器支持和安全上下文（localhost 或 HTTPS）：

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000/
```

### 构建与测试

```bash
pnpm install
pnpm run dev:studio   # 启动独立 Studio 开发服务器
pnpm run build:studio # 构建 Studio 到 dist-studio/
pnpm run test         # 旧版 Node.js 测试 + Vitest
pnpm run verify       # 两条构建链、小程序核心、类型检查与测试
```

默认 test 和 verify 门禁同时覆盖旧版 JavaScript 链路与 Vite/TypeScript/Vitest 链路。`pnpm run verify` 会先做版本一致性校验，任何产物版本漂移都会让门禁失败。

### 安卓 / Windows

见 [`docs/双端构建与发布.md`](docs/双端构建与发布.md)；发布清单、签名与产物校验见 [`docs/RELEASE.md`](docs/RELEASE.md)。

### 微信小程序

用微信开发者工具导入 `EQ-Worker-小程序/`。

---

## 项目管理

| 文档 | 用途 |
| --- | --- |
| [ROADMAP.md](ROADMAP.md) | 已完成与计划项，「完成」的判定标准 |
| [CHANGELOG.md](CHANGELOG.md) | 版本历史，含验证证据 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 开发环境、约定、测试要求 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 分层、边界与取舍 |
| [docs/adr/](docs/adr/) | 难以回退的架构决策记录 |
| [docs/RELEASE.md](docs/RELEASE.md) | 发版清单、签名、产物一致性 |
| [SECURITY.md](SECURITY.md) | 漏洞上报、范围、AI 红线 |
| [SUPPORT.md](SUPPORT.md) | 去哪问什么 |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | 社区准则 |

版本号唯一来源是 `package.json`；`scripts/sync-version.mjs` 派生并校验其余所有位置（安卓 `versionCode`/`versionName`、桌面、三份 `sw.js` 缓存名、小程序关于页），`pnpm run verify` 会在不一致时失败。

---

## 技术栈

| 层面 | 选型 |
| --- | --- |
| 语言 | JavaScript 和 TypeScript |
| 图表 | ECharts 5（旧版）/ Canvas 2D（小程序）/ SVG（Studio 相关包） |
| 存储 | localStorage / wx.storage |
| 构建 | `build.js`（旧版）/ Vite（Studio） |
| 测试 | `node --test`（旧版及小程序核心一致性）+ Vitest |
| 建议引擎 | 旧版使用规则；Studio 使用模拟或用户配置的提供商 |

---

## v3.2.0 更新

- 工程化地基：Vite + TypeScript + Vitest 与 legacy 链路并行；
- 新增 `packages/core`（部分核心函数经一致性测试）、`packages/viz`（SVG 图表）、`packages/ai`（默认关闭）与 `apps/studio`；
- 小程序改用 core bundle，删除重复引擎实现；
- 安卓 debug dev-server、桌面 `EQ_DEV_URL` 开发模式；
- 存储加固：迁移不安全时进入写保护、备份校验、内存兜底与保存回滚；
- 版本号改为单一来源，并纳入 `verify` 门禁（修正网页头部停留在 v3.1.0、安卓 versionCode 误写 312 的漂移）。

更早的版本记录见 [CHANGELOG.md](CHANGELOG.md)。

---

## 许可

Creative Commons Attribution-NonCommercial 4.0 International（CC BY-NC 4.0），详见 [`LICENSE`](LICENSE)。

<div align="center">

**人情不是算计，是把别人放在心上。**
</div>
