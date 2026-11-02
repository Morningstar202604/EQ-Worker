# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Report privately through the repository's security advisory feature (Repository → Security →
Report a vulnerability), or contact the maintainer. Include the affected client (legacy web /
Studio / Android / desktop / Mini Program), the version, reproduction steps, and the impact you
believe it has.

You can expect an acknowledgement within 7 days. This is a volunteer-maintained project, so please
allow reasonable time for a fix before public disclosure.

## Scope

EQ-Worker stores relationship records locally. The highest-severity class of bug is **data loss or
unintended data disclosure**, including:

- A migration that discards user data without a backup
- A save path that reports success when nothing was persisted
- A backup or export that includes credentials or AI provider configuration
- An AI request that sends context the user did not see and approve in the preview
- Cross-site scripting through imported JSON or person names in any UI
- Code execution through imported backup files

## Out of scope

- Missing security headers on a locally opened `file://` page
- Cosmetic or theming issues
- Rate limiting or account enumeration — there are no accounts
- Behavior of a third-party AI provider the user configured themselves

## Data handling, stated precisely

Default behavior: persons, events, reminders, and progress are stored in local storage
(`localStorage` in browsers, `wx.storage` in the Mini Program). There is no account, no server,
and no analytics.

There is **one** path by which data can leave the device, and it is opt-in: if the user enables AI
in Studio and confirms a preview, the context shown in that preview is sent to the provider the
user configured. This is why the documentation does not claim "data never leaves the device" —
that would be false the moment AI is enabled.

## Secrets in this repository

This repository must never contain API keys, platform access tokens, signing keystores, or
`keystore.properties`. CI scans for common token formats and fails the build on a match. If you
find a secret committed by accident, report it privately; do not open a pull request quoting it.

For local release signing, place `android/keystore.properties` and the keystore file yourself.
Both are listed in `.gitignore` and must stay there.

## Supported versions

| Version | Supported |
| --- | --- |
| 3.2.x | yes |
| 3.1.x and earlier | no — please upgrade |

## AI red lines

AI is off by default. When enabled:

- The key is held in `sessionStorage` and cleared when the tab closes; it is never written to a
  backup, an export, or a log.
- Nothing is transmitted until the user generates a preview and confirms it. The preview contains
  exactly the text that will be sent.
- Changing the target person, the context, the provider, or the model invalidates the approval.
- If the request fails, the app falls back to the local rule engine instead of retrying silently.

A report that the preview and the actual request can diverge is treated as a security bug.
