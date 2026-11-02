# 0004 — Version single-sourced from package.json

- **Status**: Accepted
- **Date**: 2026-11-02

## Context

A version number appears in more places than expected in this repository:

- `package.json`
- `android/app/build.gradle` (`versionName` and an integer `versionCode`)
- `desktop/package.json` and `desktop/package-lock.json`
- three `sw.js` files' `CACHE_NAME`
- the Mini Program's "About" page
- the app header (`BRAND.version`) and the HTML template

The service worker cache name is the most dangerous of these: with a Cache First strategy, failing
to change it means existing users keep receiving the old HTML forever.

This was not hypothetical. During verification the app header rendered **v3.1.0** while
`package.json` said **3.2.0**, and `versionCode` was **312** where the established pattern
(`2.8.1→281`, `3.0.0→300`, `3.1.0→310`) requires **320**. Both had drifted silently because each
value was hand-edited.

## Decision

`package.json` is the only authored version. `scripts/sync-version.mjs`:

- **verifies** every derived location by default and exits non-zero on mismatch;
- **derives** `versionCode` as `major*100 + minor*10 + patch`;
- **rewrites** the locations with `--write` for releases, touching only the version fields (the
  lockfile is edited structurally, never by blanket regex, so dependency versions are untouched).

The HTML template and app source contain an `__APP_VERSION__` placeholder that `build.js` replaces
from `package.json`. `pnpm run verify` runs the check first, so a mismatch fails CI.

## Consequences

**Good**

- The drift class of bug is now impossible to merge.
- `versionCode` arithmetic is stated once, in code, with the historical pattern recorded next to it.
- Cache-name invalidation cannot be forgotten when the version is bumped.

**Accepted costs**

- Build output depends on `package.json`; a stale build without running `build.js` will show an old
  version. CI's artifact-consistency check catches this.
- `sync-version.mjs` must be updated when a new version-bearing location is added. That is a
  feature: it forces the author to decide whether the new location should be derived.
- `--write` touches multiple files at once, so a release commit is inherently multi-file.

## Notes

The `versionCode` correction from 312 to 320 is monotonic, so already-installed builds upgrade
normally. A versionCode that decreases would require uninstalling, which is exactly the kind of
failure this record is meant to prevent.
