---
kind: code
---

# Proposal: detail-widgets-visible-when

## Summary

A detail page's grid widgets honour their `visibleWhen` against the loaded
record, and against records the page loads beside it (`visibilityContext`),
such as a case's case type. A tabs widget on the page reads the same records
for its tab conditions.

## Motivation

dossiq's case page shows the family plan and the Planninq projects panel on
every case, a Woo request included. The widget configuration lives in the
app manifest (decision of 14 October 2026), but the detail grid never
evaluated a widget's `visibleWhen`, and a condition had no way to name the
case type, which is a reference on the case rather than a field of it.

## Scope

- `CnDetailPage`: a widget whose definition carries `visibleWhen` is drawn
  only while the condition holds. Local conditions read the record; endpoint
  and source conditions are evaluated once per record. Until the record (and
  any record a condition names) has loaded the widget is left out, so it
  never flashes in and out. In edit mode every widget stays visible.
- `CnDetailPage` prop `visibilityContext` (manifest `config.visibilityContext`):
  `{ <name>: { field, register, schema } }`. The page reads the record whose
  id is in `field` and conditions read it as `@context.<name>.<path>`.
- `CnTabsWidget` reads the same `@context.<name>` records in its tab conditions.

A widget without `visibleWhen` renders exactly as before.
