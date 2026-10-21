---
kind: code
---

# Proposal: abstract-matrix-widget

## Summary

Ruben, 20 Oct 2026 (LQ-ABSTRACT audit, question 2): the grid pages are one `matrix` widget over CnDataMatrix, not a
custom view each.

learniq draws five rows-by-columns grids by hand: the cohort gradebook (learners by plan components, a typed cell
creates or patches a grade entry, a bulk `publish`), open-answer scoring (attempts by open items, a cell written
through an endpoint, a bulk `grade`), the report card review (cards by subjects with text cells and row transitions),
the curriculum coverage matrix (read only, pivoted) and the hour plan editor (one array field of the page object).
The same shape recurs in planninq capacity, humaniq timesheets and shillinq budgets per cost centre per month.

This change adds the `matrix` widget (CnMatrixWidget) and grows CnDataMatrix with keyboard access, group rows, a
norm row, marked cells and a row actions column.

## Scope

New widget, CnDataMatrix props, docs, unit tests. No manifest schema change: widget `content` is free-form. Writes go to
OpenRegister's object and transition endpoints (or a configured endpoint); the server decides, the widget shows a
refusal in the server's words.

## Out of scope

Migrating learniq (lane LQ1 does that on its own branch). Formulas, ranges, copy and paste between cells.
