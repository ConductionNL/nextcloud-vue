# CnAiHistoryList

Searchable conversation list with inline rename/describe editing. Shared by two
surfaces: [`CnAiChatPanel`](./cn-ai-chat-panel.md)'s inline "History" sidebar
tab (embedded directly — it's a plain list, not a modal, so ADR-004's
file-isolation rule doesn't apply), and
[`CnAiHistoryDialog`](./cn-ai-history-dialog.md), which wraps it in an
`NcDialog` overlay for consumers still using the dialog directly.

Search matches on both `title` and `description` (case-insensitive substring);
`description` is read from `metadata.description`, the field the inline
rename/describe control writes back via PATCH.

## Props

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `conversations` | Array | No | `[]` | Normalized conversations (see `aiChatConfig.js`'s `normalizeConversation()`). |
| `loading` | Boolean | No | `false` | Whether the parent's conversation fetch is still in flight. |
| `fetchError` | Boolean | No | `false` | Whether the parent's conversation fetch failed. |
| `activeConversationUuid` (`active-conversation-uuid`) | String | No | `null` | UUID of the active conversation, for the active-row indicator. |
| `chatAppId` (`chat-app-id`) | String | No | — | Backend app id the rename/describe PATCH resolves against. |
| `searchable` | Boolean | No | `false` | Whether to show the name/description search field. |

## Events

| Event | Payload | Notes |
|---|---|---|
| `select` | `String` (uuid) | A conversation row was clicked. |
| `renamed` | `{ uuid, title, description }` | Emitted after an inline rename/describe PATCH succeeds. |

## Behaviour

- Shows "Could not connect to AI service" on `fetchError`, an empty-state label
  when there are no conversations, and a loading state while the fetch is in
  flight.
- Rename/describe writes `title` + `metadata.description` (the hermiq
  conversation schema exposes no dedicated description column).

## Reference

- Implementation: [src/components/CnAiCompanion/CnAiHistoryList.vue](../../src/components/CnAiCompanion/CnAiHistoryList.vue)
- Wrapped by: [CnAiHistoryDialog](./cn-ai-history-dialog.md)
