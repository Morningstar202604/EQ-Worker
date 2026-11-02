# Release Process

Shipping a release means producing artifacts a stranger can verify, not just moving a tag.

## Preconditions

- `main` is green: `pnpm run verify` passes locally and in CI.
- `CHANGELOG.md` has an entry for the new version, with the date.
- `ROADMAP.md` reflects what actually shipped.
- No uncommitted generated artifacts (`git status` clean after `pnpm run verify`).

## 1. Bump the version

Edit **only** `package.json`:

```bash
npm version 3.3.0 --no-git-tag-version   # or edit by hand
node scripts/sync-version.mjs --write    # derive android/desktop/sw/mini versions
node build.js                            # inject __APP_VERSION__ into the HTML
node scripts/sync-version.mjs            # verify: must print OK
```

`sync-version.mjs --write` touches:

| File | Field |
| --- | --- |
| `android/app/build.gradle` | `versionCode`, `versionName` |
| `desktop/package.json` | `version` |
| `desktop/package-lock.json` | top-level `version` and `packages[""]` |
| `sw.js`, `desktop/sw.js`, `android/app/src/main/assets/sw.js` | `CACHE_NAME` |
| `EQ-Worker-小程序/pages/me/me.js` | displayed version |

Never hand-edit these. If one drifts, `verify` fails.

## 2. Update the changelog

Add a section at the top of `CHANGELOG.md`:

```markdown
## v3.3.0 — 2026-12-01

### Added
- ...

### Fixed
- ...

### Verification
- `pnpm run verify`: N legacy + M Vitest, typecheck and both Vite builds pass
- Browser E2E: <what was actually exercised>
- Not verified: <devices or credentials that were unavailable>
```

The verification block is mandatory. A changelog that lists features but not evidence is marketing.

## 3. Build and verify artifacts

```bash
pnpm run verify

# Android (replace with your SDK path)
GRADLE_USER_HOME=.tmp/gradle-home \
  /c/Dev/gradle-8.14.3/gradle-8.14.3/bin/gradle --no-daemon \
  -p android assembleDebug assembleRelease

# Windows desktop
cd desktop && bash build-win.sh
```

Check parity — these must be byte-identical:

```bash
sha256sum index.html EQ-Worker.html \
  android/app/src/main/assets/index.html desktop/index.html
```

## 4. Signing

`android/app/build.gradle` falls back to the debug keystore when `android/keystore.properties` is
absent. **A debug-signed APK must not be published as a release.** To sign properly, create
`android/keystore.properties` with `storeFile`, `storePassword`, `keyAlias`, `keyPassword`. Both the
properties file and the keystore are git-ignored; keep them out of the repository and out of CI logs.

Verify what you actually built:

```bash
# debug-signed builds contain only META-INF/CERT.SF and META-INF/CERT.RSA
unzip -l app-release.apk | grep META-INF
```

## 5. Tag

```bash
git tag -a v3.3.0 -m "EQ-Worker v3.3.0"
git push origin main
git push origin v3.3.0
```

Tags are annotated, not lightweight, so they carry a message and a date.

## 6. Attach artifacts

Attach the APK, the desktop zip, and a `SHA256SUMS` file to the release. Include the verification
summary from the changelog in the release notes, including what was not verified.

## Rollback

Artifacts are additive; the previous release stays available. For a bad release:

1. Do not delete the tag.
2. Publish a new patch version with the fix.
3. If the bad release corrupted data, document the recovery path prominently in the release notes —
   users may have already lost records, and a silent fix does not help them.

Version numbers are never reused.
