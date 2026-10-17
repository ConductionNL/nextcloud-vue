# Tasks: chart-bar-list-and-matrix

### Task 1: A chart can draw a bar list
- **spec_ref**: `openspec/changes/chart-bar-list-and-matrix/specs/chart-bar-list-and-matrix/spec.md#requirement-a-chart-can-draw-a-bar-list`
- **files**: `src/components/CnChartWidget/CnChartWidget.vue`, `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/schemas/app-manifest-v2.schema.json`
- [x] Implement: `bar-list` type, `barMax`, `footnote`, `valueFormat` `number`
- [x] Test: `tests/components/CnChartWidgetBarListMatrix.spec.js`

### Task 2: A chart can draw a matrix
- **spec_ref**: `openspec/changes/chart-bar-list-and-matrix/specs/chart-bar-list-and-matrix/spec.md#requirement-a-chart-can-draw-a-matrix`
- **files**: `src/components/CnChartWidget/CnChartWidget.vue`, `src/schemas/app-manifest-v2.schema.json`
- [x] Implement: `matrix` type, endpointSource `rowsPath`
- [x] Test: `tests/components/CnChartWidgetBarListMatrix.spec.js`

### Task 3: Board bar-list and matrix cards draw no header rule
- **spec_ref**: `openspec/changes/chart-bar-list-and-matrix/specs/chart-bar-list-and-matrix/spec.md#requirement-board-bar-list-and-matrix-cards-draw-no-header-rule`
- **files**: `src/css/look-board.css`
- [x] Implement: no header rule on board cards holding a bar list or matrix
