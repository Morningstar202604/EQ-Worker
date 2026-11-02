# Architecture Decision Records

Short, dated records of decisions that are expensive to reverse. Each record states the context,
the decision, and the consequences — including the costs we accepted.

| ID | Title | Status |
| --- | --- | --- |
| [0001](0001-progressive-layering-over-rewrite.md) | Progressive layering instead of a framework rewrite | Accepted |
| [0002](0002-svg-charts-without-chart-library.md) | Deterministic SVG charts instead of a charting library | Accepted |
| [0003](0003-ai-off-by-default.md) | AI is opt-in, previewed, and never required | Accepted |
| [0004](0004-version-single-source.md) | Version single-sourced from package.json | Accepted |
| [0005](0005-storage-write-protection.md) | Fail closed on unsafe storage migrations | Accepted |

## When to write an ADR

Write one when a change:

- Alters a module boundary or adds a package
- Adds or removes a dependency that ships to users
- Changes the data schema in a way that requires migration
- Changes a product-level guarantee (privacy, offline capability, supported clients)
- Reverses an earlier decision

Do not write one for ordinary refactors, renames, or bug fixes. Those belong in the changelog.

## Format

`NNNN-short-title.md` with sections: Status, Context, Decision, Consequences. Keep it under a page.
The value is in recording *why*, and in recording what we gave up.
