# Support

## Getting help

| I want to… | Go to |
| --- | --- |
| Report a bug | [Bug report](../../issues/new?template=bug_report.yml) |
| Request a feature | [Feature request](../../issues/new?template=feature_request.yml) |
| Report a security issue | **Do not** open an issue — see [SECURITY.md](SECURITY.md) |
| Understand the design | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Contribute code | [CONTRIBUTING.md](CONTRIBUTING.md) |
| See what's planned | [ROADMAP.md](ROADMAP.md) |

## Before opening an issue

1. Check that you are on the latest release.
2. Reproduce with the built-in demo dataset (welcome screen → "载入演示数据") to rule out
   your own data triggering the problem.
3. Search existing issues — the answer may already be there.

## What to include

- **Client and version**: legacy web, Studio, Android, Windows desktop, or WeChat Mini Program.
  The version is shown in the app header.
- **Steps to reproduce**, expected result, actual result.
- **Whether your data survived.** This is a data-safety product; data loss is always treated as
  critical, so say so explicitly in the title.
- Browser or device details when the problem is rendering-related.

## Response expectations

This is a volunteer-maintained project. Issues are triaged when time allows. Security reports and
data-loss bugs are handled first.

## Frequently asked

**Where is my data stored?**
In your browser's local storage (or the WebView / Mini Program storage). It is not uploaded
anywhere unless you enable AI in Studio and confirm a preview.

**How do I back up or move my data?**
Legacy client and Studio both export a JSON file. Import it on the other device. The Mini Program
copies the backup to the clipboard for you to paste elsewhere.

**Does AI send my data to a server?**
Only if you turn it on. It is off by default. When on, you see a preview of the exact text that
will be sent and must confirm it before anything leaves the device.

**Is there an account or sync?**
No account. No sync server. See the roadmap for planned local-first multi-device options.

**Why do Android and desktop look different from Studio?**
Android and Windows embed the legacy single-file client. Studio is a separate, denser workbench
built from the same logic packages. See [ARCHITECTURE.md](ARCHITECTURE.md).
