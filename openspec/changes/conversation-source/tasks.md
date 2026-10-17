# Tasks: conversation-source

### Task 1: Messages from a list
- **spec_ref**: `openspec/changes/conversation-source/specs/conversation-source/spec.md#requirement-a-conversation-reads-its-messages-from-a-list-and-maps-their-parts`
- **files**: `src/components/CnConversationThread/CnConversationWidget.vue`, `src/components/CnConversationThread/CnConversationThread.vue`, `l10n/nl.json`, `l10n/en.json`
- [x] Implement: `source`, mapping keys, channel, order, loading, direction label
- [x] Test: `tests/components/CnConversationSource.spec.js`

### Task 2: Reply action
- **spec_ref**: `openspec/changes/conversation-source/specs/conversation-source/spec.md#requirement-a-reply-can-run-an-app-action`
- **files**: `src/components/CnConversationThread/CnConversationWidget.vue`
- [x] Implement: `replyAction`
- [x] Test: `tests/components/CnConversationSource.spec.js`
