# Tasks: widget-title-when

### Task 1: A widget title can depend on the record
- **spec_ref**: `openspec/changes/widget-title-when/specs/widget-title-when/spec.md#requirement-a-widget-title-can-depend-on-the-record`
- **files**: `src/utils/widgetTitleWhen.js`, `src/components/CnDetailPage/CnDetailPage.vue`
- [x] Implement: `withTitleWhen` / `withTitlesWhen`, CnDetailPage hands every widget binding and widget list through them
- [x] Test: `tests/utils/widgetTitleWhen.spec.js`, `tests/components/CnDetailPageTitleWhen.spec.js`

### Task 2: An empty title is a card without a title row
- **spec_ref**: `openspec/changes/widget-title-when/specs/widget-title-when/spec.md#requirement-an-empty-title-is-a-card-without-a-title-row`
- **files**: `src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue`
- [x] Implement: leaf cards and host cards draw no title row for `title: ''`
- [x] Test: `tests/components/CnDetailWidgetHostEmptyTitle.spec.js`
