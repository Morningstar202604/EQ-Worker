<div align="center">
  <h1>RENQING · RADAR</h1>
  <p><b>Keep your favors clear, keep your relationships flowing.</b></p>
  <p>Relationship management · Favor ledger · Social practice — a lightweight, local-first personal assistant</p>
  <img src="https://img.shields.io/badge/Platform-Web%20PWA%20%2B%20WeChat%20Mini%20Program-green" alt="Platform" />
  <img src="https://img.shields.io/badge/Gameplay-Relationship%20Management-lightblue" alt="Playstyle" />
  <img src="https://img.shields.io/badge/Storage-Local%20First-blue" alt="Storage" />
  <img src="https://img.shields.io/badge/Version-v2.8-orange" alt="Version" />
  <img src="https://img.shields.io/badge/License-CC%20BY--NC%204.0-red" alt="License" />
  <br />
  <p>
    <a href="https://github.com/X33834/chushi-radar">GitHub</a> ·
    <a href="https://gitcode.com/badhope/chushi-radar">GitCode</a> ·
    <a href="https://gitee.com/badhope/chushi-radar">Gitee</a>
  </p>
</div>

---

## What is this

**RENQING · RADAR (人情世故雷达)** is a **relationship-keeping tool**, not a quiz.

The legacy "处世 Radar" was an 81-question social-intelligence test. Since v2 it has been rebuilt as a **keep-and-grow gameplay**: you only need to spend 10 seconds after a dinner recording one interaction, and the radar does the rest — drawing a relationship profile, computing the warmth score, and reminding you whom to visit, which favor to return, and whose birthday to celebrate.

## Try it online

- **GitHub Pages** (mirror-hosted, auto-deploys on every push):
  - <https://x33834.github.io/chushi-radar/>
  - <https://morningstar202604.github.io/chushi-radar/>
- **Gitee** (domestic mirror): <https://badhope.gitee.io/chushi-radar/>
- **Brand website**: <https://x33834.github.io/chushi-radar/%E5%AE%98%E7%BD%91/%E4%BA%BA%E6%83%85%E4%B8%96%E6%95%85%E9%9B%B7%E8%BE%BE%E5%AE%98%E7%BD%91.html> (source in `官网/人情世故雷达官网.html`)

All editions share the same codebase: `index.html` at the repo root is the web app (identical to `人情世故雷达.html`); pushing to `main` auto-deploys it to GitHub Pages.

## Core gameplay (5 closed-loop modules)

```
Record interactions → Auto profile → Smart reminders → Scenario training → Annual report
```

| Module | What it does |
| --- | --- |
| Radar overview | 5-dimension profile (network scale / warmth / frequency / credit / wisdom) + overall index + smart reminders (festivals / favors owed / long-no-contact / birthdays / todos, color-coded by urgency) |
| People management | One radar card per person; warmth = event weighting + 90-day half-life decay, manually adjustable; search / role filter / 3 sort modes |
| Quick record | 10 event types with auto favor values (dinner / help / gifts / lending / heart-to-heart...), undo supported |
| Practice arena | 15 Chinese social scenarios (wedding gifts / toasting / borrowing money / saving face...), difficulty tiers, raises wisdom & level |
| Profile | Monthly insights, 6-month trend, annual report, todo management, backup & migration (clipboard / file / CSV) |

## Two platforms

| Platform | Description |
| --- | --- |
| Web (PWA) | Single self-contained HTML (~1.1 MB, zero build), works offline, installable to home screen; built-in open-source ECharts |
| WeChat Mini Program | Full mini-program project (this repo `人情世故雷达-小程序/`), hand-drawn radar on Canvas with zero dependencies, data structure compatible with the web app |

## Data & privacy

- All data stays on your device (browser localStorage / mini-program local cache) — **nothing is uploaded to any server**
- Switching devices? Use "Export backup / Copy backup → paste-import on the new device"; formats are interoperable
- Date & festival reminders use a built-in lunar calendar (1900–2100)

## Version history

| Version | Highlights |
| --- | --- |
| v2.0 | Full rebuild into 4-in-1: Radar / People / Record / Practice, vanilla JS + ECharts (v1 quiz edition deleted) |
| v2.1–v2.6 | Lunar festival reminders, diary-note aesthetics, install guide, todo management, dimension insights, annual report, backup migration, batch bug fixes |
| v2.7 | Brand system (Logo / Slogan / welcome guide / about page), reminder urgency color fix |
| v2.8 | Reminder-to-record shortcut, full transaction overview, Top-3 people to keep, interaction-type distribution chart; remembers last tab, search empty-state polish |
| v2.8.1 | Annual report PNG export (html2canvas), relationship network Canvas graph (ring layout, identity-colored nodes, click-to-view person details) |

## Run locally

- **Web**: open `人情世故雷达.html` directly in any browser (Chrome / Safari / WeChat built-in browser recommended)
- **Mini program**: import `人情世故雷达-小程序/` into WeChat DevTools to preview

## License

Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0), see `LICENSE`.
