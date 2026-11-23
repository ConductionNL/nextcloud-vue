---
kind: code
---

# Proposal: screens-metric-affix-translate

## Summary

`formatMetricValue` appended a stat's `format.prefix` and `format.suffix` exactly as the manifest wrote them. Labels,
captions and titles of the same tiles go through the host app's translate (`cnTranslate`), but the affixes did not, so
a Dutch user read "1,5 days" while the app's catalogue holds " dagen". pipelinq worked around it by rewriting its
manifest before handing it to CnAppRoot (`src/utils/statFormatLabels.js`).

## Scope

- `src/utils/formatMetric.js`: `translateMetricAffixes`, and an optional `translate` argument on `formatMetricValue`.
  A literal affix goes through it. A `@config.` / `@object.` token is resolved, never translated.
- The callers pass their translate: `CnStatWidget` (also every tile of a stats-block grid), `CnStatsBlockWidget`
  entries and single source, `CnDeltaWidget`, `CnGaugeWidget`.
- No manifest schema change.

## Not in this change

- Removing pipelinq's workaround: once the app is on this release it can drop `translateStatFormatLabels`. Keeping it
  is harmless: it translates first, and the translated text has no catalogue entry of its own, so it stays as it is.
