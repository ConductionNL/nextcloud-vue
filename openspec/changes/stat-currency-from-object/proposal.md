---
kind: code
---

# Proposal: stat-currency-from-object

## Summary

A stats-block entry's money value is shown in the currency the entry names,
formatted with Intl in the user's locale.

1. A stats-block entry (CnStatsBlockWidget `entries[]`) accepts `format`, as a
   `type: "stat"` widget's `content.format` does: a style name such as
   `"currency"`, or `{ style, currency, currencyField, decimals, prefix,
   suffix }`. Before this an entry's `"format": "currency"` was ignored and
   the bare count was shown.
2. A money value says where its currency comes from. `currencyField` names
   the field of the detail page's object that holds it (a sales contract's
   own `currency`); `currency` is a code or a token (`@config.currency`,
   `@object.currency`). Either one on the entry implies `format: "currency"`.
3. The currency is taken from the object, then `currency`, then the app's
   reporting currency (`currency` in the page's app config), then EUR. A step
   without a three-letter code is skipped, so nothing throws.
4. Numbers are formatted in the user's Nextcloud locale
   (`getCanonicalLocale()`), else the browser's.
5. The stat widget (`CnStatWidget`) had the same gap: its `content.format`
   could only reach `@config.<key>`. It now reads `currencyField` and
   `@object.<field>` from the page object too.
6. The single-source stats block gets a `format` prop with the same shape.

## Motivation

Ruben, 7 October 2026: pipelinq's sales contract stat blocks print "EUR"
(a hard-coded `countLabel`) though a contract has its own currency field.
pipelinq's manifest notes that stats-block entries ignore `"format":
"currency"`.

## Scope

- `src/utils/formatMetric.js`: `resolveFormatCurrency`, `normalizeMetricFormat`,
  `metricLocale`; `formatMetricValue` takes the page object.
- `src/components/CnStatsBlockWidget/CnStatsBlockWidget.vue`,
  `src/components/CnStatWidget/CnStatWidget.vue`,
  `src/components/CnDashboardPage/CnDashboardPage.vue` (forwards `format`).
- `src/schemas/app-manifest-v2.schema.json` 2.51.0: `statsBlockEntry` gains
  `format`, `currency`, `currencyField`.

## Backward compatibility

An entry without `format`, `currency` or `currencyField` renders exactly as
before. A stat widget whose `format.style` is `currency` and names no
currency now shows the app's reporting currency when the app config sets
one, instead of always EUR. Numbers follow the Nextcloud locale setting
instead of the browser's when the two differ.
