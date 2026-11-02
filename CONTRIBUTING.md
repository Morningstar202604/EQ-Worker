# Contributing to EQ-Worker

Thanks for taking the time to contribute. This project is a local-first relationship ledger;
the most valuable contributions are correctness fixes, accessibility improvements, and
documentation that keeps the three UIs honest about what they actually do.

## Before you start

1. Read `README.md` (English) and `ARCHITECTURE.md`.
2. Search existing issues and pull requests so you do not duplicate work.
3. For anything larger than a typo, open an issue first and describe the problem, not only the fix.

## Ground rules

- **Never commit personal data.** No real names, phone numbers, addresses, backups, or
  screenshots containing someone's real relationship data. Use the demo dataset.
- **Never commit secrets.** API keys, tokens, keystores, and `keystore.properties` stay out of
  the repository. See `SECURITY.md`.
- **Keep the product local-first.** Do not introduce a required server, account system, or
  telemetry. Optional features that send data off-device must be opt-in, previewed before
  sending, and documented as such.
- **One logical change per pull request.** Mixed refactor + feature + formatting changes are
  hard to review and will be asked to split.

## Development setup

Requirements: Node.js 20+ and pnpm 12.

```bash
pnpm install
pnpm run dev:studio     # Studio dev server
pnpm run build:studio   # build Studio to dist-studio/
pnpm run test           # legacy node:test + Vitest
pnpm run verify         # full gate: version, builds, tests, typecheck, dist
```

`pnpm run verify` is the definition of "green". A pull request that does not pass it will not
be merged.

## Repository layout

| Path | Responsibility |
| --- | --- |
| `packages/core` | Pure domain logic — types, dates, sanitization, ledger, health, actions, ICS, storage |
| `packages/viz` | Deterministic SVG charts, zero runtime dependencies |
| `packages/ai` | Opt-in AI orchestration (off by default), provider adapters, preview pipeline |
| `apps/studio` | The second UI, built by Vite from the packages above |
| `_app_dev.js`, `index.template.html`, `build.js` | The legacy single-file client and its build |
| `EQ-Worker-小程序/` | WeChat Mini Program |
| `android/`, `desktop/` | Native shells that embed the legacy build output |
| `tests/` | Legacy `node:test` suites, including cross-end parity |

See `ARCHITECTURE.md` for the reasoning behind this split.

## Coding conventions

- **Pure logic lives in `packages/core`.** If you find yourself copying an algorithm into a
  shell or a second UI, the algorithm belongs in the package instead.
- **Explicit state and time.** Domain functions take state as their first argument and accept an
  optional `now` for testability. No hidden globals, no `Date.now()` inside pure functions.
- **TypeScript for new code.** The legacy `_app_dev.js` is maintained as-is for the single-file
  build; new behavior goes into the packages and is wired in from there.
- **Chinese and English UI strings are separate concerns.** Do not concatenate translations into
  one string for convenience.
- **Comments explain why, not what.** A comment restating the code is noise.

## Testing expectations

- Bug fixes need a regression test that fails before the fix.
- New behavior needs a test at the level where the behavior is observable: pure functions in
  `packages/*/tests`, UI behavior in `apps/studio/tests`, cross-end contracts in `tests/`.
- Do not weaken assertions, delete tests, or skip tests to make a suite pass. If a test is
  genuinely wrong, say so in the pull request and explain why.
- Storage and migration changes must cover the failure path (write error, corrupted input,
  partial migration), not only the happy path.

## Commit messages

Use imperative mood, present tense:

```
fix(storage): keep original data when migration backup fails
feat(studio): invalidate AI preview when target changes
docs(readme): clarify which clients share one build
```

Scope is the area touched (`core`, `ai`, `studio`, `mini`, `android`, `desktop`, `docs`, `ci`).
Keep the subject under 72 characters. Explain the reasoning in the body when it is not obvious.

## Pull requests

A reviewable pull request includes:

- What problem it solves and why this approach was chosen
- What was verified, with the exact command and result
- What was **not** verified, and why (missing device, missing credential, etc.)
- Screenshots for visible UI changes

Claims of "all tests pass" or "fully verified" must be backed by pasted command output. Reviewers
will ask for it.

## Localization

English is the primary documentation language. `README.zh.md` and other `*.zh.md` files are
maintained translations. When you change user-visible English text, update the translation in the
same pull request or mark it clearly as pending.

## Reporting bugs

Use the bug report issue form. Include:

- Which client (legacy web / Studio / Android / desktop / Mini Program) and its version
- Steps to reproduce, expected result, actual result
- Whether the data survived (this is a data-safety product; loss of data is always critical)

## License

Contributions are accepted under CC BY-NC 4.0, the license of this repository. By submitting a
pull request you confirm you have the right to license the work under those terms.
