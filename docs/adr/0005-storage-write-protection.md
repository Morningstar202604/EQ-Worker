# 0005 — Fail closed on unsafe storage migrations

- **Status**: Accepted
- **Date**: 2026-11-02

## Context

The product stores records of relationships: who gave what, when, and how much is owed. Users cannot
reconstruct this from memory — that is precisely why they use the app. Silent data loss is therefore
the worst possible defect, worse than a crash, because a crash is noticed.

The migration path had a specific hazard. `migrate()` sanitizes whatever it reads. Sanitization is
necessary — imported JSON is untrusted — but it also silently drops unknown fields, coerces types,
and converts full dates to `MM-DD`. Running that over a user's own stored data can quietly delete
information that a future version would have understood.

Separately, the storage adapter swallowed exceptions and returned `false` from `setItem`, while
callers ignored the result and showed a success toast. A user could record a gift, see "saved", and
lose it on refresh.

## Decision

**Fail closed.** When the stored payload cannot be round-tripped losslessly, refuse to write rather
than overwrite.

- `migrate()` compares the raw input to the sanitized output field by field (`preservesInput`) and
  reports `unsafe` plus `backupRequired`.
- `createStore()` exposes `isWriteProtected()`. When set, saves are rejected and the state stays
  read-only in memory.
- Before a lossy migration, the Mini Program writes `_migration_backup`, reads it back, and compares.
  If the backup cannot be verified, it refuses to proceed.
- A corrupted primary key does **not** fall back to a legacy key. Falling back would replace the
  user's real data with older data, which is a loss disguised as a recovery.
- `createLocalAdapter` keeps a `pending` set so that a failed persist still returns the user's newest
  value to the UI, and the UI reports "saved to memory only".
- Every save path that can fail (`engine.update`) rolls the state back and tells the user, instead of
  leaving the form cleared.

## Consequences

**Good**

- The default failure mode is "refuse and warn", not "overwrite and hope".
- Users are told when their data is only in memory, so they can export a backup before losing it.
- The rules are testable: every branch above has a regression test with a failing storage double.

**Accepted costs**

- Some users with unusual or corrupted payloads will see a read-only app. That is intentional, but
  it is a worse first-run experience than silently "fixing" their data — and the fix is a documented
  export/repair path, not a guess.
- `preservesInput` is strict: adding a field the sanitizer does not know about will mark the payload
  unsafe. Contributors must extend the sanitizer and the preservation check together.
- The comparison runs on every load. It is O(size of state) with small constant factors; acceptable
  for datasets of realistic size, but not free.
- The Mini Program implementation is a parallel copy of the same rules in plain JS, because it cannot
  consume the TypeScript build directly in that environment. Parity is covered by tests, not by
  shared code.
