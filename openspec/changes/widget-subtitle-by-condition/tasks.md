# Tasks: widget-subtitle-by-condition

### Task 1: A card subtitle can depend on the record
- **spec_ref**: `openspec/changes/widget-subtitle-by-condition/specs/widget-subtitle-by-condition/spec.md#requirement-a-card-subtitle-can-depend-on-the-record`
- **files**: `src/utils/conditionalText.js`, `src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue`, `docs/components/cn-widget-wrapper.md`
- [x] Implement: `pickConditionalText`; the host's `widgetSubtitle` reads `[{ when, text }]` against the record and its `@context` rows
- [x] Test: `tests/utils/conditionalText.spec.js`, `tests/components/CnDetailWidgetHostSubtitleByCondition.spec.js`
