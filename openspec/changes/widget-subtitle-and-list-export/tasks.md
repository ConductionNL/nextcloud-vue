# Tasks: widget-subtitle-and-list-export

### Task 1: A widget card's subtitle
- **spec_ref**: `openspec/changes/widget-subtitle-and-list-export/specs/detail-page/spec.md#requirement-a-widget-card-can-carry-a-subtitle`
- **files**: `src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue`
- [x] Implement: pass `subtitle` to every card the host draws
- [x] Test: `tests/components/CnDetailWidgetHostSubtitle.spec.js`

### Task 2: A list's export
- **spec_ref**: `openspec/changes/widget-subtitle-and-list-export/specs/object-list-widget/spec.md#requirement-a-list-can-offer-its-rows-as-an-export`
- **files**: `src/components/CnObjectListWidget/CnObjectListWidget.vue`
- [x] Implement: `content.export` as a header action, with the group gate
- [x] Test: `tests/components/CnObjectListWidgetExport.spec.js`
