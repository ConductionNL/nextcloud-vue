# CnAiHistoryDialog

Conversation history browser dialog. Lives in `src/dialogs/` per ADR-004 modal/dialog file-isolation rule.

Wraps `NcDialog` from `@nextcloud/vue`. Opened by `CnAiChatPanel` when the user clicks the History button. On open, fetches the 50 most-recent conversations from:

```
GET /index.php/apps/openregister/api/chat/conversations?limit=50
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `open` | `boolean` | `false` | Controls dialog visibility (v-model compatible via `update:open`) |
| `activeConversationUuid` | `string` \| `null` | `null` | UUID of the currently active conversation (shown with an active indicator) |

## Events

| Event | Payload | Description |
|---|---|---|
| `update:open` | `boolean` | Emitted to close the dialog (X button, Escape, outside click) |
| `select` | `string` (UUID) | Emitted when the user clicks a conversation entry. Followed by `update:open=false`. |

## States

- **Loading** — `NcLoadingIcon` shown while the conversation list is being fetched.
- **Empty** — `NcEmptyContent` with `t(appName, 'No conversations yet')`.
- **Error** — `NcEmptyContent` with an error icon and `t(appName, 'Could not connect to AI service')`.

## Focus management

Closing the dialog (X or Escape) emits `update:open=false`. The parent (`CnAiChatPanel`) is responsible for returning focus to the History button (WCAG 2.4.3).

## Usage

```vue
<CnAiHistoryDialog
  :open="isHistoryOpen"
  :active-conversation-uuid="activeConversationUuid"
  @update:open="isHistoryOpen = $event"
  @select="onConversationSelect" />
```
