# Tasks: screens-relation-pages

## Implementation Tasks

### Task 1: A tab can hold a stack of widgets
- **spec_ref**: `openspec/changes/screens-relation-pages/specs/relation-pages/spec.md#requirement-a-tab-can-hold-a-stack-of-widgets`
- **files**: `src/components/CnTabsWidget/CnTabsWidget.vue`, `src/css/look-board-detail.css`, `docs/components/cn-tabs-widget.md`
- [x] Implement: `widgetIds` resolution, stacked panel, label default, countFrom on the first list
- [x] Test: stack order, unresolved id skipped, label default, widgetId unchanged (`tests/components/CnTabsWidgetStack.spec.js`, e2e `e2e/screens-relation-pages.e2e.js`)

### Task 2: A record list
- **spec_ref**: `openspec/changes/screens-relation-pages/specs/relation-pages/spec.md#requirement-a-record-list-shows-the-objects-that-point-at-this-record`
- **files**: `src/components/CnRecordListWidget/`, `src/utils/fillTemplate.js`, `src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue`, `src/utils/widgetDispatch.js`, `src/components/CnWidgetGrid/registerDashboardWidgets.js`, `src/utils/libraryWidgetKeys.js`, `docs/components/cn-record-list-widget.md`
- [x] Implement: fetch, templates with formats, rows / feed / inline, header link and note with `{total}` (the detail host draws them in the card header), empty and error lines
- [x] Test: each presentation, first-filled trailing, total in the header, no fetch while a token is unresolved (`tests/components/CnRecordListWidget.spec.js`, `tests/utils/fillTemplate.spec.js`, `tests/components/CnDetailWidgetHostRendererHeader.spec.js`, e2e `e2e/screens-relation-pages.e2e.js`)

### Task 3: The facts card draws contact details, identity and a lead (on top of lane A's `facts`, #1477)
- **spec_ref**: `openspec/changes/screens-relation-pages/specs/relation-pages/spec.md#requirement-the-facts-card-draws-contact-details-identity-and-a-lead`
- **files**: `src/components/CnFactsWidget/CnFactsWidget.vue`, `src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue`, `src/css/look-board-detail.css`, `docs/components/cn-facts-widget.md`
- [x] Implement: email / phone / url / masked formats, reveal (event + `cn:facts:reveal` bus channel), copy, row icon, lead, text lines, constant text, action, header action (the detail host draws it in the card header, also on a side card)
- [x] Test: each key, reveal event, mailto and tel links, entries without the keys unchanged (`tests/components/CnFactsWidgetRelationKeys.spec.js`, `tests/components/CnDetailWidgetHostRendererHeader.spec.js`, e2e `e2e/screens-relation-pages.e2e.js`)

### Task 4: Constant and count header pills (schema 2.85.0)
- **spec_ref**: `openspec/changes/screens-relation-pages/specs/relation-pages/spec.md#requirement-a-header-pill-can-be-a-constant-or-a-count`
- **files**: `src/components/CnDetailPage/CnDetailHeaderChips.vue` or the pill code in `CnDetailPage.vue`, `src/schemas/app-manifest-v2.schema.json`
- [ ] Implement: `text`, `countFrom` + `countLabel`
- [ ] Test: constant pill, count 1 and 2, 0 and failure render nothing, field pill unchanged

### Task 5: Per-row count column
- **spec_ref**: `openspec/changes/screens-relation-pages/specs/relation-pages/spec.md#requirement-a-list-column-can-count-related-objects-per-row`
- [ ] Implement and test (a later PR)

### Task 6: Harness and e2e
- [ ] `e2e/harness` person page with a stack tab, record lists and facts cards; `e2e/screens-relation-pages.e2e.js`

### Task 7: Live check
- [ ] shillinq ShKlant / ShLeveranciers pixel diff (lane R phase 2); pipelinq and dossiq through their lanes (round6/R/apply-*.md)
