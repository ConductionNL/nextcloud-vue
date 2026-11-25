# Tasks: conversation-reply-endpoint-tokens

### Task 1: The reply endpoint takes the record's tokens
- **spec_ref**: `openspec/changes/conversation-reply-endpoint-tokens/specs/conversation-source/spec.md#requirement-the-reply-endpoint-is-filled-from-the-record-like-the-source`
- **files**: `src/components/CnConversationThread/CnConversationWidget.vue`, `docs/components/cn-conversation-widget.md`
- [x] Implement: `endpoint` fills `@object.<path>`; an unresolved token posts nowhere
- [x] Test: `tests/components/CnConversationReplyEndpointTokens.spec.js`
