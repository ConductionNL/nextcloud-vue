# Tasks: record-source-verbs

### Task 1: Record sources offer verbs, and the detail page draws them
- **spec_ref**: `openspec/changes/record-source-verbs/specs/record-source-verbs/spec.md#requirement-a-record-source-offers-header-verbs`
- **files**: `src/composables/useTaskInboxStore.js`, `src/composables/indexSources.js`, `src/components/CnDetailPage/CnDetailPage.vue`
- [x] Implement: `runRecordVerb` on the inbox store; `verbs` and `runVerb` on the tasks source; verb buttons, menu entries, `verbEndpoints` and `runSourceVerb` on CnDetailPage
- [x] Test: `tests/components/CnDetailPageSourceVerbs.spec.js`
