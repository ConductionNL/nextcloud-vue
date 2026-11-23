# Tasks: timeline-worded-history

### Task 1: Shared audit words
- **spec_ref**: `openspec/changes/timeline-worded-history/specs/timeline-widget/spec.md#requirement-a-timeline-says-what-an-audit-entry-changed-in-words`
- **files**: `src/utils/auditLabels.js`, `src/components/CnAuditTrailCard/CnAuditTrailCard.vue`, `src/components/CnTimelineWidget/CnTimelineWidget.vue`, `src/utils/timelineEvents.js`
- [x] Implement: shared labels, `{changed.<key>.old}`, timeline labels/exclusions/limit
- [x] Test: `tests/utils/auditLabels.spec.js`, `tests/components/CnTimelineWidgetWordedHistory.spec.js`

### Task 2: Related records named
- **spec_ref**: `openspec/changes/timeline-worded-history/specs/timeline-widget/spec.md#requirement-a-related-records-event-can-name-the-record`
- **files**: `src/utils/timelineEvents.js`
- [x] Implement: label tokens, `when`
- [x] Test: `tests/components/CnTimelineWidgetWordedHistory.spec.js`
