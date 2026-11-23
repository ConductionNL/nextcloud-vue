---
kind: code
---

# Proposal: dashboard-table-reference-labels

## Summary

An index page shows the name of the object a column references when the column says `labelField`. A table on a
dashboard (`type: "object-table"`) did not: board ShDebiteurenbeheer lists the open invoices by customer name, and the
shillinq page showed the customer's id.

A column of an `object-table` now takes `labelField` and/or `resolve` (`{ register, schema, labelField? }`, the shape
the avatar cell and the facts widget take). With `resolve` the column names where its references point. Without it the
target is read off the source schema's `$ref` for that property, as on an index page. Such a column renders as the
existing `fkResolve` cell, which fetches through the shared object store (one request per referenced object, cached
per schema).

## Scope

- `src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue`: `refLabelColumns`, `renderedColumns`,
  `loadRefTargets` (one schema read when a column needs the `$ref`).
- No manifest schema change: a dashboard widget's `content` is not validated field by field.
- A column without `labelField` or `resolve`, or with a cell `widget` of its own, renders as before. A label column
  whose target cannot be found shows the raw value, as before.
