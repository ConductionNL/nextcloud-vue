# CnAiRecentSessions

Up-to-five recent-conversation cards shown on the AI Chat Companion's "start a
new conversation" screen (the empty-state of
[`CnAiChatPanel`](./cn-ai-chat-panel.md)), plus a "View all conversations"
expander that hands off to the searchable History tab
([`CnAiHistoryList`](./cn-ai-history-list.md)). Purely presentational — the
parent owns and fetches `conversations` and `loading`.

## Props

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `conversations` | Array | No | `[]` | Up to 5 normalized conversations (see `aiChatConfig.js`'s `normalizeConversation()`). |
| `activeConversationUuid` (`active-conversation-uuid`) | String | No | `null` | UUID of the active conversation, for the active-card indicator. |
| `loading` | Boolean | No | `false` | Whether the parent's conversation fetch is still in flight. |

## Events

| Event | Payload | Notes |
|---|---|---|
| `select` | `String` (uuid) | A recent-conversation card was clicked. |
| `view-all` | — | "View all conversations" clicked — parent opens the History tab. |

## Behaviour

- Renders nothing while loading or when there are no conversations yet — the
  surrounding empty-state's own message already covers that case.

## Reference

- Implementation: [src/components/CnAiCompanion/CnAiRecentSessions.vue](../../src/components/CnAiCompanion/CnAiRecentSessions.vue)
- Parent: [CnAiChatPanel](./cn-ai-chat-panel.md)
