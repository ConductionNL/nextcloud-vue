# Tasks: detail-endpoint-answer-parts

### Task 1: Attach parts of the answer to the record
- **spec_ref**: `openspec/changes/detail-endpoint-answer-parts/specs/detail-page/spec.md#requirement-a-detail-page-over-an-app-endpoint-keeps-the-other-parts-of-the-answer`
- **files**: `src/composables/indexSources.js`, `docs/components/cn-detail-page.md`
- [x] Implement
- [x] Test: `tests/composables/recordSourceEndpointAttach.spec.js`

### Task 2: Post the reply under the endpoint's own field
- **spec_ref**: `openspec/changes/detail-endpoint-answer-parts/specs/detail-page/spec.md#requirement-a-conversation-reply-is-posted-under-the-endpoints-own-field`
- **files**: `src/components/CnConversationThread/CnConversationThread.vue`, `src/components/CnConversationThread/CnConversationWidget.vue`, `docs/components/cn-conversation-thread.md`, `docs/components/cn-conversation-widget.md`
- [x] Implement
- [x] Test: `tests/components/CnConversationMessageKey.spec.js`
