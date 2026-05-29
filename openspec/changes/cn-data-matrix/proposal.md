# CnDataMatrix — inline-edit grid for matrix data

## Why

The scholiq triage flagged `GradebookView` (cohort × plan grid with inline-editable scores) as a custom because no lib widget supports matrix-shaped inline-edit data. The shape recurs for weight matrices, scoring rubrics, allocation tables — any "spreadsheet" where cells are independently editable values, not row/object forms.

## What

`src/components/CnDataMatrix/CnDataMatrix.vue` (~390 LOC). Click-to-edit cells with Enter / blur commit + Esc cancel. Per-column `type` (`'number'` coerces; `'string'` verbatim) + `readOnly` + `formatter` + `aggregate`. Optional row / column / grand totals computed from live data. Emits `@cell-edit({rowId, colKey, value, row})` on commit; parent persists then mutates `rows[]`.

## Non-goals

- Formula language / cell-range references.
- Cell selection / copy-paste.
- Chart-from-grid.
- Pagination (consumers slice `rows[]` themselves).

## References

- [nextcloud-vue#293](https://codeberg.org/Conduction/nextcloud-vue/issues/293).
- scholiq `GradebookView`.
