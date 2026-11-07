# Competitive Analysis — 13 Comparable Projects

> Deep dive into directly comparable open-source projects (gift-money ledgers, personal
> relationship managers, reminder tools), their best ideas, and what we adopted.
> Compiled 2026-11-07 from live research, not homepage skims.

## Scope & Method

EQ-Worker sits at the intersection of three product families: Chinese gift-money
ledgers (礼金账本), personal relationship managers (PRM), and date/birthday reminder
tools. We studied the strongest project in each family plus the most-starred
alternatives, reading their actual feature sets, architecture notes, and release
practices — then decided adopt / adapt / reject for each idea.

## Projects Studied

| # | Project | Family | Standout ideas |
|---|---------|--------|----------------|
| 1 | [RenqingLedger 人情账](https://github.com/TTNAN/renqing-ledger) | Gift ledger | Suggestion **always ships with itemized reasoning**; ledger sheet export to PDF/image with repeated headers; explicit SmartScreen/install-location docs for non-technical users |
| 2 | [gift-book 礼簿](https://github.com/jingguanzhang/gift-book) | Gift ledger (wedding desk) | Keyboard-only rapid entry; **Chinese uppercase amounts (壹仟元整)** for tamper-proof records; duplicate-entry risk control; TTS readout; guest second screen; audit trail + soft delete; AES-256 at rest |
| 3 | [Gift_Ledger 随礼记](https://github.com/final00000000/Gift_Ledger) | Gift ledger | **Event-book view** (batch entries per occasion); solar **and lunar dates**; Excel/JSON export; in-app update channels (stable/beta) |
| 4 | [Monica](https://github.com/monicahq/monica) | PRM (25k★) | Relationship **chains between contacts**; multi-vault, 27 languages; razor-clear product boundaries ("not a social network, never will be") |
| 5 | [PingCRM](https://github.com/sneg55/pingcrm) | PRM + AI | Life-event detection from messages; relationship scoring; follow-up drafts |
| 6 | [Tilly](https://github.com/carlassmann/tilly) | PRM PWA | Relationship **journal** framing; offline-first PWA polish |
| 7 | [Kindred](https://github.com/pike00/Kindred) | PRM | Tracks gifts **and debts** per contact; full-text search; CardDAV sync |
| 8 | [Meerkat CRM](https://github.com/fbuchner/meerkat-crm) | PRM | Frictionless birthday reminders; public demo instance |
| 9 | [CircleLens](https://github.com/alixsep/CircleLens) | Visualization | Interactive social-graph analysis |
| 10 | [people-context](https://github.com/JinyangWang27/people-context) | AI memory | Local-first people memory via **MCP + CLI on SQLite** |
| 11 | [birthday-reminder](https://github.com/Airmole/birthday-reminder) | Reminders | `calendar: solar \| lunar` + `isLeap` field design for birthdays; webhook push; CSV template import |
| 12 | [HappyDayReminder](https://github.com/fp-space/HappyDayReminder) | Reminders | Solar + lunar birthday emails via CI cron |
| 13 | [Tribu](https://github.com/itsDNNS/tribu) | Household | CalDAV/CardDAV phone sync; read-only wall display; 24 UI languages |

## Adopted in This Release (v3.9.0 → unreleased)

| Idea | Source | What we shipped |
|------|--------|-----------------|
| Chinese uppercase amounts | gift-book | `fmtMoneyCN()` in core; shown in CLI `gift`, server `/gift` (`cn` field), MCP `advise_gift` (大写) |
| Event-level ledger CSV (礼簿流水) | gift-book, Gift_Ledger, RenqingLedger | `ledgerCsv()` in core; CLI `export --format=ledger`, server `GET /api/export/ledger.csv` (BOM for Excel) |
| Reasoning-always-with-advice | RenqingLedger | Already core to our `giftAdvice().reasons`; verified and kept |
| Debts split from gifts in balances | Kindred | Already core (`balanceByKind`); verified |
| MCP + CLI local memory surface | people-context | Already core (15 MCP tools); verified |
| Release-verification honesty (uninstall/data docs) | RenqingLedger | RELEASE.md SHA256 + install docs; security policy in place |

## Designed, Scheduled Next (not half-wired now)

Ideas we deliberately did **not** merge this round — each needs schema work and a
full UI/CLI/server pass, and we refuse to ship dead code (the exact failure mode
our audits screen for):

1. **Lunar birthday support** (#11, #3, #12): add `calendar: 'solar'|'lunar'` +
   `isLeap` to Person, vendor the MIT-licensed `lunar-javascript` algorithm in core,
   convert in `upcomingDates`/reminders. Estimated as the headline item of v3.10.
2. **PDF ledger sheet export** (#1, #2): client-side PDF with repeated headers;
   CSV above is the dependency-free first step.
3. **Relationship chains between contacts** (#4): `relations: [{personId, type}]`
   on Person; feeds the graph view.
4. **Duplicate-entry risk control** (#2): warn on same person + amount + occasion
   within N days before insert.
5. **Social graph visualization** (#9): depends on #3.

## Rejected (with reasons)

- **TTS readout / guest second screen** (#2): serves the wedding reception desk;
  EQ-Worker is a personal advisor, not a reception tool — wrong audience.
- **AES-256 at rest** (#2): conflicts with our "one JSON file, import anywhere,
  grep your own data" philosophy; password loss = data loss. Revisit only with a
  documented key-recovery story.
- **Cloud sync / CardDAV** (#7, #13): violates the zero-network guarantee that is
  the product's hardest promise.
- **In-app update channels** (#3): our artifacts update via platform releases;
  adding a second channel doubles the surface for no user gain.

## Verification

Everything under "Adopted" is covered by `tests/money-csv.test.ts` (6 cases) and
exercised end-to-end by `tests/cli.test.mjs` / `tests/server.test.mjs` /
`tests/mcp.test.mjs` against the built artifacts.
