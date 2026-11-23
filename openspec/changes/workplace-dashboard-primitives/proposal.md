---
kind: code
---

## Why

The Zuiddrecht workplace design puts a small set of building blocks on every
dashboard and list: a week of deadlines, one bar that shows where the cases
are, a card that says what to do first, a greeting, a two-way view switch,
counts on filters, a person in a table cell, a deadline that turns red, and
the three-band brand stripe. Apps would otherwise each build these by hand,
and each would differ. The library ships them once.

## What Changes

Everything is additive. No existing prop, slot, manifest key or default changes.

- New dashboard widget `week-strip` (`CnWeekStripWidget` + `CnWeekStripWidgetForm`).
- New dashboard widget `stacked-bar` (`CnStackedBarWidget` + `CnStackedBarWidgetForm`).
- `CnBannerWidget` gains `layout: "attention"` with `kicker`, `title`, `reason` and up to two `actions`.
- `CnHeaderWidget` gains `content.greeting` and `content.showDate`.
- New component `CnSegmentedControl`, and `CnTabs` gains `variant="segmented"`.
- `CnQuickFilterBar` and `CnSavedViewsControl` can show a count per entry; `CnIndexPage` fetches the counts for entries that set `showCount`.
- `CnCellRenderer` gains the built-in cell widgets `avatar` and `date` (with `variantWhen` rules).
- New component `CnBrandStripe`.

## Impact

- Manifest schema v2: two new `widgetKey` branches, new optional `banner` props, `showCount` on `quickFilters[]`.
- No consumer has to change anything. Version bump: minor.
