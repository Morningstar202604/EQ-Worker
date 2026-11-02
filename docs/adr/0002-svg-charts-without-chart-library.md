# 0002 — Deterministic SVG charts instead of a charting library

- **Status**: Accepted
- **Date**: 2026-10-31

## Context

The app needs five chart types: radar, relationship network, trend line, flow, and a health gauge.
The legacy client uses ECharts. ECharts is roughly 1 MB minified, which matters because the whole
application ships as one self-contained HTML file that must stay reasonable to download and parse
on a mid-range phone.

Beyond size, ECharts requires a DOM container and a render lifecycle. That makes charts awkward to
test: a test either needs a real browser or a canvas mock, and the assertion becomes "the chart
object received this data" rather than "the chart shows this".

## Decision

Build charts in `packages/viz` as **pure functions returning SVG strings**, with no runtime
dependencies.

- No `Math.random()`; all layout is a deterministic function of the input.
- All text is escaped through a single `escapeXml` helper.
- Each chart emits `role="img"` with `<title>` and `<desc>` for screen readers.
- `viewBox` drives responsiveness instead of measuring the container.

## Consequences

**Good**

- Zero bytes added to the single-file build.
- Tests assert on the actual markup, so a broken axis label or a missing series fails a test.
- Charts render in any environment that can hold a string: innerHTML, SSR, a test, a PDF export.
- Accessibility attributes come for free because we own the markup.

**Accepted costs**

- No animations, zoom, or tooltips out of the box. If those are wanted, they are hand-built.
- The legacy client keeps ECharts for its existing interactive charts; two chart stacks coexist.
- String-based output cannot catch a chart that is valid SVG but visually misleading. Visual review
  remains a manual step.
- Large datasets need manual downsampling; there is no built-in data reduction.
