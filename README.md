<div align="center">

<img src="brand/logo-icon.svg" alt="EQ-Worker" width="96" height="96" />

# EQ-Worker

**Remember what you owe people.**

<b>English</b> · <a href="README.zh.md">简体中文</a>

[![Version](https://img.shields.io/badge/version-v3.9.1-orange)](CHANGELOG.md)
[![Tests](https://img.shields.io/badge/tests-624%20passing-brightgreen)](tests/)
[![License](https://img.shields.io/badge/license-CC%20BY--NC%204.0-red)](LICENSE)

[**Open in browser →**](https://x33834.github.io/EQ-Worker/) · [Windows](https://github.com/badhope/EQ-Worker/releases) · [Android](https://github.com/badhope/EQ-Worker/releases)

</div>

---

## What it does

| | |
| --- | --- |
| **Gift advisor** | Relationship × occasion × tier × city → three amounts, each with the arithmetic shown |
| **Separate tracks for joyous and funeral occasions** | Condolence money uses odd-number tiers, celebrations use auspicious numbers; the two never offset each other |
| **Gift taboos** | Clocks, umbrellas, pears, shoes, white chrysanthemums, knives — matched to the occasion, with exemption words so "pineapple cake" is not flagged |
| **Relationship ledger** | Gifts given, gifts received and loans kept apart; see who owes whom and how much |
| **Script advisor** | 18 real scenarios × 3 tones — declining a loan, chasing a repayment, condolences, toasts — ready to copy |
| **Health check** | Finds the relationship most worth tending and tells you the next step |

---

## Screens

<table>
<tr>
<td width="50%"><img src="docs/screenshots/v3/03-gift.png" alt="Gift advisor" /><br /><sub><b>Gift advisor</b> — three tiers, the arithmetic and etiquette notes</sub></td>
<td width="50%"><img src="docs/screenshots/v3/02-ledger.png" alt="Relationship ledger" /><br /><sub><b>Ledger</b> — incoming and outgoing separated, net balance at a glance</sub></td>
</tr>
<tr>
<td><img src="docs/screenshots/v3/04-script.png" alt="Script advisor" /><br /><sub><b>Script advisor</b> — 18 scenarios × 3 tones, copy and send</sub></td>
<td><img src="docs/screenshots/v3/10-health.png" alt="Health check" /><br /><sub><b>Health check</b> — sorted by score, the one to fix first on top</sub></td>
</tr>
</table>

---

## What the AI actually does (and doesn't)

| Capability | Status |
| --- | --- |
| Generate scripts / gift reasoning / reviews | ✅ 4 pipelines, off by default, bring your own key |
| Call local functions to look up data | ✅ 8 read-only tools (find person / gift advice / ledger / etiquette / scripts / today / health) |
| Web search | ⚠️ **Optional, off by default**. Three selectable backends: free scraping / model-side browsing / your own endpoint |
| Free web search out of the box | ✅ **Yes.** Built-in free scraping (Bing results + Sogou fallback), **no API key required** |
| Local etiquette knowledge base | ✅ Ships with a national baseline; import regional packs and local market rates to override |
| Vector search / RAG | ❌ None |

**Scope.** The AI capabilities above live in **Studio** (`apps/studio`, built by Vite), the CLI / MCP surfaces and the SDK. The single-file web app, the Android APK, the Windows installer and the WeChat Mini Program are **fully local and contain no AI and no network calls** — every suggestion there comes from on-device rules. Studio is a second UI, not part of the legacy release artifacts (see [ARCHITECTURE.md](ARCHITECTURE.md)).

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

| Platform | How |
| --- | --- |
| Web | Open `EQ-Worker.html` directly, or use the [online build](https://x33834.github.io/EQ-Worker/) |
| Windows | Download `EQ-Worker-3.9.1-x64.exe` from [Releases](https://github.com/badhope/EQ-Worker/releases) |
| Android | Download the APK from [Releases](https://github.com/badhope/EQ-Worker/releases) |
| WeChat Mini Program | Import `EQ-Worker-小程序/` in WeChat DevTools |
| CLI / MCP | `node dist-cli/eqw.mjs` · `node dist-mcp/eq-worker-mcp.mjs` |

---

## Docs

[ARCHITECTURE.md](ARCHITECTURE.md) · [CHANGELOG.md](CHANGELOG.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [SECURITY.md](SECURITY.md)

<div align="center">

**Relationships are not arithmetic. They are remembering people.**

</div>
