# Architecture

This document explains how EQ-Worker is put together and, more importantly, **why** it is put
together this way. If you are about to change module boundaries, read this first.

## Design constraints that drive everything

1. **Local-first.** Data lives in the browser, the WebView, or the Mini Program storage. There is
   no account, no server, no telemetry. Any feature that would break this must be opt-in.
2. **The legacy single-file client must keep working.** `index.html` is a self-contained ~1.4 MB
   file that runs from `file://`, inside a WebView, and offline. Android and desktop shells embed
   exactly that file. This constraint rules out a framework rewrite of the main UI.
3. **Multiple UIs, one set of rules.** The same ledger math, health scoring, and gift advice must
   produce identical numbers in every client. Divergence is a correctness bug, not a cosmetic one.

Constraint 2 and constraint 3 are in tension. The resolution is the layered split below.

## Layers

```
┌──────────────────────────────────────────────────────────────┐
│ shells: android/  desktop/   (embed the legacy build output)  │
├──────────────────────────────────────────────────────────────┤
│ UIs:  _app_dev.js (legacy, single file)   apps/studio (Vite)  │
│       EQ-Worker-小程序/ (Mini Program)                        │
├──────────────────────────────────────────────────────────────┤
│ packages/ai     opt-in orchestration, providers, preview      │
│ packages/viz    deterministic SVG charts                      │
├──────────────────────────────────────────────────────────────┤
│ packages/core   pure domain: types, date, sanitize, ledger,   │
│                 health, actions, scripts, ics, storage        │
└──────────────────────────────────────────────────────────────┘
```

**`packages/core` has no UI and no DOM dependency.** Every function is pure, takes state as its
first parameter, and accepts an optional `now` so tests can pin time. Storage is behind an
adapter interface so the same logic runs on `localStorage`, `wx.storage`, and in-memory test
doubles.

**`packages/viz` returns SVG strings, not DOM nodes.** This keeps it usable from the single-file
client (where innerHTML is the only tool), from Studio, and from tests that assert on markup
without a browser. It has no runtime dependencies — deliberately, because the single-file build
cannot afford a charting library.

**`packages/ai` is optional and off by default.** It declares providers behind a minimal
`FetchLike` interface instead of importing an SDK, so the single-file build stays dependency-free
and tests can inject a fake transport. See `docs/ai-privacy.md` for the red lines.

**`apps/studio` is a second UI, not a replacement.** It is built by Vite into `dist-studio/` and
is *not* part of the legacy release artifacts. It exists to demonstrate the packages and to give
power users a denser workbench.

## Why not rewrite the main UI in a framework

Evaluated and rejected. A React/Vue rewrite would either (a) break the single-file, offline,
`file://` requirement, or (b) require shipping the framework inside the single file, growing it
several times over. The legacy UI is therefore maintained incrementally, and new logic is added
to the packages and wired in. This is a deliberate trade-off, not technical debt left unattended.

## Build chain

Two chains, one gate.

| Chain | Command | Output |
| --- | --- | --- |
| Legacy | `node build.js` | `index.html`, `EQ-Worker.html`, synced into `android/app/src/main/assets/` and `desktop/` |
| Mini Program core | `node scripts/build-mini-core.mjs` | `EQ-Worker-小程序/utils/core.bundle.js` |
| Vite web | `vite build --config vite.config.ts` | `dist-vite/` |
| Vite Studio | `vite build --config vite.studio.config.ts` | `dist-studio/` |

`pnpm run verify` runs the version check, both builds, both test suites, the type check, and both
Vite builds. CI runs the same command, then asserts that generated artifacts in the tree match a
fresh build — so forgetting to rebuild after editing `_app_dev.js` fails CI instead of silently
shipping stale code.

## Version single source

`package.json` is the only place a version number is authored. `scripts/sync-version.mjs` derives
and verifies the others:

| Location | Derived value |
| --- | --- |
| `android/app/build.gradle` | `versionName`, `versionCode` = `major*100 + minor*10 + patch` |
| `desktop/package.json`, `desktop/package-lock.json` | `version` |
| `sw.js` × 3 | `CACHE_NAME` — must change on every release or Cache First serves stale HTML |
| `EQ-Worker-小程序/pages/me/me.js` | displayed version |
| `_app_dev.js`, `index.template.html` | `__APP_VERSION__` placeholder, replaced at build time |

The version used to drift silently (the header showed `v3.1.0` while the package said `3.2.0`).
The script exists so that failure mode cannot recur, and `verify` fails on any mismatch.

## Storage and data safety

The product's core value is a record of relationships the user cannot reconstruct. Data loss is
therefore treated as a severity-one defect.

- `migrate()` returns `unsafe` and `backupRequired` flags by comparing the raw input against the
  sanitized output field by field. If sanitization would drop anything the user wrote, the store
  enters write protection rather than overwriting.
- `createLocalAdapter` falls back to memory when storage throws, and tracks which keys are
  pending so reads return what the user just typed instead of a stale persisted value.
- The Mini Program writes a `_migration_backup` key and reads it back to verify before allowing a
  lossy migration. A corrupted primary key does **not** silently fall back to a legacy key.
- UI layers surface write protection to the user. Silent "saved" when nothing was saved is a bug.

## Where things go

| You are adding… | It belongs in… |
| --- | --- |
| A new domain rule (scoring, advice, sanitization) | `packages/core/src` + a test in `packages/core/tests` |
| A new chart | `packages/viz/src` returning an SVG string |
| A new AI provider | `packages/ai/src/providers` behind `FetchLike` |
| A new screen for the workbench | `apps/studio/ui` (data) + `apps/studio/views` (markup) |
| A change to the legacy UI | `_app_dev.js`, then rebuild — never edit `index.html` |
| A shell behavior | `android/` or `desktop/` only |

## Known trade-offs

- **Duplicated markup logic between legacy and Studio.** They render different things for
  different audiences; sharing a component layer would force the single-file build to carry it.
- **Mini Program has its own page logic.** It shares the core bundle but not the UI. Page-level
  bugs must be tested at the page level, not inferred from core tests.
- **`packages/viz` output is asserted as strings.** Cheap and deterministic, but it will not catch
  a chart that is technically valid and visually wrong. Visual review is still manual.

---

## 扩展端（v3.4.0）

新增三个入口，共享同一个 `packages/core`：

| 端 | 目录 | 为什么单独立端而不是塞进 Studio |
| --- | --- | --- |
| CLI | `apps/cli` | 面向脚本与自动化。要求零依赖、可管道、`--json` 稳定；这些诉求与 GUI 相反。 |
| 本地后台 | `apps/server` | 面向「想在大屏上看全貌」的场景。需要 HTTP 与鉴权，这些不该进静态单页应用。 |
| MCP | `apps/mcp` | 面向 AI 客户端。协议是 stdio JSON-RPC，生命周期由宿主控制，与浏览器端完全不同。 |

### 分层边界（重要）

`packages/core` **不得** import `node:fs`、`node:path` 等内置模块——它要进浏览器与微信小程序。
凡是依赖文件系统的能力放 `packages/node`：

```
packages/core   ← 浏览器 / 小程序 / Node 都能用
packages/node   ← 只在 Node 里用（文件存储、数据目录）
```

这条边界不是靠自觉，是靠构建强制：`vite build` 一旦在依赖图里遇到 `node:fs` 会直接报错。
v3.3.0 开发时把文件适配器放进 core，构建立刻失败，才拆出 `packages/node`。

### 存储一致性

`createFileStore()` 会显式调用 `store.load()`。这不是冗余——`createStore()` 只建空状态，
少了这一步，CLI 每次启动都是空库，写回时覆盖磁盘真实数据。同类问题在 v3.3.0 已经踩过一次
（`Store` 缺 `setState` 导致成绩不持久化），因此两处都补了回归测试。

### 为什么不引框架

后台只有六个视图、一张表、两个弹窗。引入 React/Vue 会让产物体积翻十倍、多一条构建链，
对一个本地工具是净损失。需要更复杂交互时再升级，不提前支付成本。

MCP 则相反：协议由别人定义，必须用官方 SDK（`@modelcontextprotocol/sdk`），
自己实现 JSON-RPC 握手与能力协商是重复造轮子且容易漏掉规范细节。
