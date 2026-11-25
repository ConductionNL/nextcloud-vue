# Tasks: conversation-endpoint-poll

### Task 1: Endpoint source and polling for the conversation widget
- **spec_ref**: `openspec/changes/conversation-endpoint-poll/specs/conversation-source/spec.md#requirement-a-conversation-reads-its-messages-from-an-endpoint-and-reads-them-again`
- **files**: `src/components/CnConversationThread/CnConversationWidget.vue`, `docs/components/cn-conversation-widget.md`
- [x] Implement: `source.url` + `responsePath`, url tokens, `pollSeconds`, `pollUntil`, stop on unmount, read again after a reply
- [x] Test: `tests/components/CnConversationEndpointPoll.spec.js`
