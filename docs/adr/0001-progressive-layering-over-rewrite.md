# 0001 — Progressive layering instead of a framework rewrite

- **Status**: Accepted
- **Date**: 2026-10-31

## Context

EQ-Worker began as a single HTML file with an inline JavaScript application. That format is not an
accident: it runs from `file://`, works offline, and is embedded verbatim by the Android WebView
shell and the Windows Electron shell. All three clients therefore share one artifact.

The file grew past 3,000 lines with logic duplicated across the web client, the WeChat Mini
Program, and the native shells. Numbers diverged between clients — a correctness problem, since
the product's value is a consistent ledger.

Three options were on the table:

1. **A. Keep growing the monolith.** Cheapest short term; unmaintainable, and cross-client
   divergence stays unfixable.
2. **B. Rewrite the UI in React or Vue.** Best component ergonomics; either breaks the
   single-file/offline/`file://` constraint, or forces the framework into the single artifact,
   multiplying its size.
3. **C. Port to a cross-platform framework (Taro).** One codebase for web and Mini Program; but the
   framework dictates the engine's runtime, and the ledger logic becomes hostage to it.
4. **D. Progressive layering.** Extract the domain logic into TypeScript packages, keep the legacy
   UI, add a second Vite-built UI, and make every client consume the same packages.

## Decision

**Option D.** `packages/core` holds pure domain logic; `packages/viz` and `packages/ai` layer on
top; `apps/studio` is a new UI built from them. The legacy `_app_dev.js` UI is maintained
incrementally rather than rewritten, and continues to ship as the primary artifact. The Mini
Program consumes a bundle generated from `packages/core` instead of a hand-copied engine.

## Consequences

**Good**

- One implementation of the ledger math, health scoring, and advice rules.
- The single-file artifact keeps its size and its offline guarantee.
- Each step was shippable and revertible; no big-bang migration.
- The Mini Program's duplicated 662-line engine was deleted.

**Accepted costs**

- Two UI layers exist and are not shared. Markup logic is duplicated between legacy and Studio.
- Legacy `_app_dev.js` remains plain JavaScript, so it gets weaker type safety than the packages.
- Cross-end parity must be enforced by tests (`engine.parity.test.ts`, `mini-core-parity.test.mjs`)
  rather than by the type system, because the legacy engine cannot be type-checked against the
  package.
- `packages/core` must stay free of DOM and Node APIs, which constrains how convenience code is
  written.

## Notes

The packages are consumed via relative source imports, not built artifacts, so there is no publish
step and no version skew between packages. `packages/viz` is the only one with its own
`package.json`/`tsconfig` because it was developed and tested standalone.
