# CnAiRecentSessions

Up-to-five recent-conversation cards shown on the AI Chat Companion's new-chat
screen, so a user can resume a conversation instead of always starting over.

Presentational only — the parent (`CnAiChatPanel`) owns fetching conversations
and the active-conversation state.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `conversations` | `Array` | `[]` | Conversations to show, newest first. Only the first five are rendered. |
| `activeConversationUuid` | `string` | `null` | The currently-open conversation, highlighted in the list. |
| `loading` | `boolean` | `false` | Whether conversations are still being fetched. |

## Events

| Event | Payload | Description |
|---|---|---|
| `select` | `string` — the conversation uuid | A card was clicked; the parent loads that conversation. |
| `view-all` | — | The view-all affordance was activated; the parent switches to the History tab for the full, searchable list. |

## Behaviour

- Caps at five cards by design: this is a sidebar, and the full list lives in
  History (searchable on name and description).
- A conversation's name and description come from the conversation record, so
  cards are only as readable as the conversation is named — see
  `CnAiHistoryList` for inline renaming.
