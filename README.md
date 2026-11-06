<div align="center">

<img src="brand/logo-icon.svg" alt="EQ-Worker" width="96" height="96" />

# EQ-Worker

**记住你欠谁的人情。**

<b>English</b> · <a href="README.zh.md">简体中文</a>

[![Version](https://img.shields.io/badge/version-v3.8.0-orange)](CHANGELOG.md)
[![Tests](https://img.shields.io/badge/tests-603%20passing-brightgreen)](tests/)
[![License](https://img.shields.io/badge/license-CC%20BY--NC%204.0-red)](LICENSE)

[**Open in browser →**](https://x33834.github.io/EQ-Worker/) · [Windows](https://github.com/badhope/EQ-Worker/releases) · [Android](https://github.com/badhope/EQ-Worker/releases)

</div>

---

## What it does

| | |
| --- | --- |
| **随礼参谋** | 关系 × 场合 × 档位 × 城市，给出三档金额并写明每一档怎么算出来的 |
| **白事/红事分轨** | 帛金走单数档、喜事走吉数档；红白事不可对冲 |
| **送礼避雷** | 钟/伞/梨/鞋/白菊/刀具等忌讳，按场合适配（探病、寿宴另有一套） |
| **人情账本** | 送礼、收礼、借款分账；谁欠谁、欠多少，一眼看清 |
| **话术参谋** | 20 个真实场景 × 3 种语气，拒绝借钱、催还、吊唁、敬酒都能直接用 |
| **关系体检** | 找出最该经营的那一段，告诉你下一步做什么 |

---

## Screens

<table>
<tr>
<td width="50%"><img src="docs/screenshots/v3/03-gift.png" alt="随礼参谋" /><br /><sub><b>随礼参谋</b> — 三档金额 + 算式 + 礼俗提醒</sub></td>
<td width="50%"><img src="docs/screenshots/v3/02-ledger.png" alt="人情账本" /><br /><sub><b>人情账本</b> — 收送分账，净额一眼可见</sub></td>
</tr>
<tr>
<td><img src="docs/screenshots/v3/04-script.png" alt="话术参谋" /><br /><sub><b>话术参谋</b> — 20 场景 × 3 语气，可直接复制</sub></td>
<td><img src="docs/screenshots/v3/10-health.png" alt="关系体检" /><br /><sub><b>关系体检</b> — 按健康度排序，先修最该修的</sub></td>
</tr>
</table>

---

## What the AI actually does (and doesn't)

| Capability | Status |
| --- | --- |
| Generate scripts / gift reasoning / reviews | ✅ 4 pipelines, off by default, bring your own key |
| Call local functions to look up data | ✅ 8 read-only tools (find person / gift advice / ledger / etiquette / scripts / today / health) |
| Web search | ⚠️ **Optional, off by default**. Two backends: model-side browsing, or a search endpoint you configure |
| Free web search out of the box | ❌ No built-in free quota. Search APIs bill per call; or self-host SearXNG |
| Local etiquette knowledge base | ✅ Ships with a national baseline; import regional packs and local market rates to override |
| Vector search / RAG | ❌ None |

Hard constraints:

- **Zero network requests by default.** A test asserts this: flip the default to "on" and it fails.
- While search is off, the UI does **not** render the key or endpoint fields.
- When on, it states plainly that queries leave the device — and queries never carry names, notes, or amounts.
- Tool calls are **read-only**; names are masked to "this friend" unless you opt in.

---

## SDK

To embed the gift engine, etiquette rules, or script generator elsewhere:

```bash
node scripts/build-sdk.mjs
# → dist-sdk/eq-worker-sdk.mjs  (ESM, zero deps, 89 exports)
```

```js
import { createEmptyState, giftAdvice } from './eq-worker-sdk.mjs';
const advice = giftAdvice(state, 'p1', '白事');   // ¥501 / ¥701 / ¥1001, all odd
```

See [docs/SDK.md](docs/SDK.md).

---

## Install

```bash
git clone https://github.com/badhope/EQ-Worker.git
cd EQ-Worker && pnpm install && pnpm run verify
```

| 平台 | 方式 |
| --- | --- |
| 网页 | 直接打开 `EQ-Worker.html`，或访问 [在线版](https://x33834.github.io/EQ-Worker/) |
| Windows | [Releases](https://github.com/badhope/EQ-Worker/releases) 下载 `EQ-Worker-3.6.0-x64.exe` |
| Android | [Releases](https://github.com/badhope/EQ-Worker/releases) 下载 APK |
| 微信小程序 | 开发者工具导入 `EQ-Worker-小程序/` |
| CLI / MCP | `node dist-cli/eqw.mjs` · `node dist-mcp/eq-worker-mcp.mjs` |

---

## Docs

[ARCHITECTURE.md](ARCHITECTURE.md) · [CHANGELOG.md](CHANGELOG.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [SECURITY.md](SECURITY.md)

<div align="center">

**人情不是算计，是把别人放在心上。**

</div>
