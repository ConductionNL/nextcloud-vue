# CnAiHistoryDialog

Modal that lists the user's past AI Chat Companion conversations and lets them
re-open one. Lives in `src/dialogs/` and is mounted by
[`CnAiCompanion`](./cn-ai-companion.md) when the user opens the history panel.

## Props

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `open` | Boolean | No | `false` | Controls dialog visibility (`v-model:open`-style). |
| `activeConversationUuid` (`active-conversation-uuid`) | String | No | `null` | UUID of the conversation currently shown in the chat panel, so the matching row is highlighted. |

## Behaviour

- Fetches the conversation list from OpenRegister on open; shows "Loading conversations…", "No conversations yet", or a "Could not connect to AI service" state as appropriate.
- Emits a selection event that `CnAiCompanion` forwards as `load-conversation` to `CnAiChatPanel`.

## Reference

- Implementation: [src/dialogs/CnAiHistoryDialog.vue](../../src/dialogs/CnAiHistoryDialog.vue)
- Parent: [CnAiCompanion](./cn-ai-companion.md)
