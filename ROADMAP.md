# Roadmap

EQ-Worker ships in small, verifiable slices. Each item below states what "done" means so
progress is checkable rather than aspirational.

Legend: `[x]` shipped · `[ ]` planned · `[~]` partially shipped

---

## 1.x / 2.x — Single-file PWA era (archived)

- [x] Ledger, gift advisor, script advisor, relationship health, annual report
- [x] Android WebView shell, Windows Electron shell, WeChat Mini Program
- [x] Offline PWA with service worker

## 3.0 — Product reset

- [x] Repositioned as a relationship ledger for everyday etiquette, not a quiz app
- [x] One-tap settlement, ledger insights, health ranking

## 3.1 — Depth on the ledger

- [x] Partial settlement with editable amount
- [x] Ledger insights (monthly in/out, average, most-invested occasion)
- [x] Person detail settlement entry

## 3.2 — Engineering foundation (current)

- [x] TypeScript core extracted to `packages/core`, parity-tested against the legacy engine
- [x] `packages/viz` — deterministic, zero-dependency SVG charts
- [x] `packages/ai` — opt-in AI orchestration, off by default, preview-before-send
- [x] `apps/studio` — second UI built on the packages, built by Vite
- [x] WeChat Mini Program consumes the core bundle instead of a hand-copied engine
- [x] Dual build chain (`build.js` legacy + Vite) gated by one `verify` command
- [x] Storage hardening: write protection on unsafe migrations, backup before lossy import,
      in-memory fallback with explicit user warning, rollback on failed saves
- [x] Version single-sourced from `package.json` and enforced by `scripts/sync-version.mjs`

## 3.3 — Open-source project maturity

- [x] Repository management documents: CONTRIBUTING, CODE_OF_CONDUCT, SECURITY policy, SUPPORT
- [x] Issue forms and PR template
- [~] Documented release process with checksums (docs/RELEASE.md); formal tag signing still pending (needs a maintainer GPG key)
- [x] Bilingual documentation with English as the primary language
- [x] Architecture decision records (ADR) under `docs/adr/`
- [x] Automated dependency updates (Dependabot, weekly)

## 3.4 — Verified delivery

- [x] Rebuild and re-verify desktop and Android artifacts against the hardened storage layer
- [ ] Formal release signing (user-provided keystore; never committed)
- [ ] WeChat Mini Program device testing on a real handset
- [x] End-to-end browser test suite committed to CI (Playwright, ubuntu + windows)

## 4.0 — Candidate directions

These are directions, not commitments. Each needs its own design note before implementation.

- [~] Multi-device sync without a self-hosted server (local-first CRDT or file-based merge)
- [ ] Import from common formats (CSV contact exports, calendar feeds)
- [ ] Richer relationship graph analysis
- [ ] Accessibility pass to WCAG 2.2 AA across all three UIs

---

## How items leave this file

An item is removed from "planned" only when the repository contains the change **and** the
verification that proves it. A green test suite alone does not qualify if the feature was never
exercised the way a user would use it.
