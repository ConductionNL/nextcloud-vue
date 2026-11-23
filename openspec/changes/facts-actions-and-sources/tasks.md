# Tasks: facts-actions-and-sources

### Task 1: Declared actions on a facts card
- **spec_ref**: `openspec/changes/facts-actions-and-sources/specs/facts-widget/spec.md#requirement-facts-can-carry-declared-actions`
- **files**: `src/components/CnFactsWidget/CnFactsWidget.vue`
- [x] Implement: `actions[]` with `@source.<field>`, `visibleWhen` on the record shown, `adminOnly`; reload on the page refresh
- [x] Test: `tests/components/CnFactsWidgetActionsSources.spec.js`

### Task 2: Sources: the first match of a query, an app endpoint, answered rows
- **spec_ref**: `openspec/changes/facts-actions-and-sources/specs/facts-widget/spec.md#requirement-facts-can-show-the-first-match-of-a-query`
- **files**: `src/components/CnFactsWidget/CnFactsWidget.vue`
- [x] Implement: `source` with `filter` and `sort`, `endpointSource`, `emptyWhen`, `rowsPath`
- [x] Test: `tests/components/CnFactsWidgetActionsSources.spec.js`

### Task 3: Entry templates, suffix and numbers
- **spec_ref**: `openspec/changes/facts-actions-and-sources/specs/facts-widget/spec.md#requirement-a-facts-entry-can-fill-a-template`
- **files**: `src/components/CnFactsWidget/CnFactsWidget.vue`, `docs/components/cn-facts-widget.md`
- [x] Implement: `template`, `suffix`, `format: "number"` with `decimals`
- [x] Test: `tests/components/CnFactsWidgetActionsSources.spec.js`
