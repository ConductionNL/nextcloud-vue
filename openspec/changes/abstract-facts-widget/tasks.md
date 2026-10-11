# Tasks: abstract-facts-widget

## Implementation Tasks

### Task 1: The widget
- **spec_ref**: `openspec/changes/abstract-facts-widget/specs/facts-widget/spec.md#requirement-a-facts-widget-draws-configured-fields-of-the-current-object`
- **files**: `src/components/CnFactsWidget/CnFactsWidget.vue`, `src/components/CnFactsWidget/index.js`
- [x] Implement: rows, title, line, pill, formats, map, hideEmpty, emptyText, translate
- [x] Test: `tests/components/CnFactsWidget.spec.js`

### Task 2: The source
- **spec_ref**: `openspec/changes/abstract-facts-widget/specs/facts-widget/spec.md#requirement-a-facts-widget-can-read-one-other-object`
- **files**: `src/components/CnFactsWidget/CnFactsWidget.vue`
- [x] Implement: register/schema/id and url sources, token resolution, blocked request, error line, `@source.<field>` in routes and link
- [x] Test: `tests/components/CnFactsWidget.spec.js`

### Task 3: Registration and chrome
- **spec_ref**: `openspec/changes/abstract-facts-widget/specs/facts-widget/spec.md#requirement-a-facts-widget-gets-the-titled-card-on-a-detail-page`
- **files**: `src/utils/widgetDispatch.js`, `src/utils/libraryWidgetKeys.js`, `src/components/CnWidgetGrid/registerDashboardWidgets.js`, `src/components/index.js`, `src/index.js`
- [x] Implement: catalog registration, content-only type, exports
- [x] Test: registry + content-only assertion in the unit spec; `tests/utils/libraryWidgetKeys.spec.js`

### Task 4: Docs and browser check
- **files**: `docs/components/cn-facts-widget.md`, `e2e/facts-widget.e2e.js`, `e2e/harness/FactsHarness.vue`
- [x] Docs page with every content key and prop
- [x] Harness e2e: the row grid (label column as wide as the widest label, 16px gap, label colour lighter than value)
