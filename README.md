<div align="center">

# EQ-Worker

**A local-first Chinese social intelligence assistant — keep favors clear, keep relationships warm.**

Daily actions · Favor ledger · Gift advisor · Conversation scripts · Relationship health

Local-first · Zero server · No ads · No tracking

<a href="README.zh.md"><b>简体中文</b></a> · <a href="README.md">English</a>

[![Version](https://img.shields.io/badge/version-v3.0.0-orange)](https://gitcode.com/badhope/EQ-Worker)
[![License](https://img.shields.io/badge/license-CC%20BY--NC%204.0-red)](LICENSE)

</div>

---

## Why EQ-Worker

Most people do not struggle with relationships because they do not care. They struggle because they cannot remember, cannot calculate, and cannot find the right words:

- Who helped you, whom you owe a dinner, what happened last month;
- How much to give for a wedding, a baby, a housewarming, or a hospital visit;
- How to decline a loan request, ask for money back, or apologize without sounding cold.

EQ-Worker puts these into one **local-first workspace**. Every time you open it, it tells you what to do today, then gives you the ledger, a gift range, and scripts you can copy.

> It is not a fancier contacts app. It is an assistant that **thinks one step ahead about your relationships**.

---

## Core features

### 1. Daily actions (assistant home)

Combines birthdays, anniversaries, overdue reminders, fading relationships, favor debt, ledger balances, thank-you follow-ups, and key-relationship maintenance into one prioritized list.

Every action carries two buttons, for example:

- **Gift advisor** → a concrete gift range;
- **Reconnect script** → three ready-to-copy tones;
- **Log it** → record the interaction in ten seconds.

### 2. Favor ledger

- Record gift / received gift / loan / repayment with amount, direction, and occasion;
- Per-person net position: **I owe them** / **they owe me** / **settled**;
- Totals: given, received, net, people owed, people owing;
- Filters and CSV export;
- **Money only affects the ledger, never the heat / trust / favor-debt scores.**

### 3. Gift advisor

Suggests **simple / appropriate / generous** ranges based on relationship, occasion, tier, and city, with explanations:

- baseline by relationship and occasion;
- what they gave you on the same occasion (return gifts should not be lower);
- an upward adjustment when your ledger shows a net debt;
- their likes and taboos as gift-selection hints.

> Gift amounts vary heavily by region, closeness, and local custom. Treat this as a reference, not a rule.

### 4. Conversation scripts

16 high-frequency scenes: reconnect, thank, apologize, ask a favor, decline, refuse a loan, collect a debt, give a gift, toast, visit the sick, decline an invitation, festival greetings, invite to dinner, follow up, birthday, anniversary.

Each scene offers **steady / close / brief** versions, automatically using the person's name, role, and latest interaction. One-click copy.

### 5. Relationship health

Combines heat, trust, intimacy, activity, ledger reciprocity, and conflicts in the past year into a 0–100 score with concrete next steps.

### 6. Important dates and calendar

Birthdays and anniversaries recur yearly; reminders are one-off events. Export everything as `.ics`.

### 7. Everything from v2 remains

- Five-dimension person profiles;
- Quick logging with undo, search highlight, role filters, three sort modes;
- 15 Chinese social scenarios and ranks;
- Monthly insights, annual report, relationship network;
- Achievements, PWA offline support, JSON / clipboard / CSV migration.

---

## Screenshots

| Assistant | Favor ledger |
| --- | --- |
| ![assistant](docs/screenshots/v3/01-assistant.png) | ![ledger](docs/screenshots/v3/02-ledger.png) |

| Gift advisor | Conversation scripts |
| --- | --- |
| ![gift](docs/screenshots/v3/03-gift.png) | ![scripts](docs/screenshots/v3/04-script.png) |

| Quick record | Mobile |
| --- | --- |
| ![record](docs/screenshots/v3/05-record.png) | ![mobile](docs/screenshots/v3/06-mobile.png) |

---

## Platforms

| Platform | Status | Notes |
| --- | --- | --- |
| **Web (PWA)** | Full | Self-contained single HTML file, offline-ready |
| **Android** | Full | Native WebView shell embedding the same `index.html` |
| **Windows desktop** | Full | Portable Electron build |
| **WeChat Mini Program** | Lite | Radar, contacts, record, training, profile; data-compatible with Web v4, without the new assistant/advisor UI |

---

## Data and privacy

- **Zero server**: data stays in local storage;
- No account, no ads, no analytics;
- Backups are plain JSON and can move between web and mini program;
- Legacy `rqsg_radar_v2` data migrates automatically to `eqworker_db_v1`.

---

## Quick start

Open `EQ-Worker.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
# http://localhost:8000/
```

Build and test:

```bash
npm run build   # _app_dev.js + index.template.html → index.html / EQ-Worker.html, sync Android and desktop assets
npm test        # 49 unit tests
npm run verify  # build + all tests
```

Android / Windows build instructions: [`docs/双端构建与发布.md`](docs/双端构建与发布.md).

WeChat Mini Program: import `EQ-Worker-小程序/` into WeChat DevTools.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Language | Vanilla JavaScript (no framework) |
| Charts | ECharts 5 (inline) / Canvas 2D (mini program) |
| Storage | localStorage / wx.storage |
| Build | `build.js` — ESM, zero dependencies |
| Tests | `node --test`, 49 cases |
| Advisor | Local explainable rules, no external AI calls |

---

## v3.0.0

- Rebranded from 人情世故雷达 to **EQ-Worker**;
- New **assistant home / daily actions**;
- New **favor ledger** with amounts, direction, occasion, filters, CSV;
- New **gift advisor**;
- New **conversation scripts** (16 scenes × 3 tones);
- New **relationship health** and per-person ledger;
- New **.ics export**;
- Data schema v4 with automatic migration;
- 49 tests passing, zero browser console errors.

---

## License

Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0). See [`LICENSE`](LICENSE).

<div align="center">

**Relationships are not transactions — but remembering matters.**
</div>
