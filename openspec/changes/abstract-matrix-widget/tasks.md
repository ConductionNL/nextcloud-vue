# Tasks: abstract-matrix-widget

- [x] Pure model (`utils/matrixModel.js`): pivot cells by row and column key, rows from a list or an object field, labels, groups, field-mode writes, norm checks, bulk targets.
- [x] CnDataMatrix: keyboard-reachable cells, `groupKey` group rows, `normRow`, column `markBelow`, `#row-actions` column.
- [x] CnMatrixWidget: read mode, cell writes (create and patch, or an endpoint), field mode with one PATCH, totals and norms, row transitions, a bulk transition with confirm and refusal report.
- [x] Register `matrix` in the dashboard catalog, content-only types, library keys, barrel export.
- [x] Docs page `docs/components/cn-matrix-widget.md`; CnDataMatrix docs updated.
- [x] Jest specs for the model, the grown CnDataMatrix and the widget; Dutch strings.
