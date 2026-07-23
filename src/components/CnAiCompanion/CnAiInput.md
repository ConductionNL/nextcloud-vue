# CnAiInput

Multi-line textarea + send button + file-attach control for the AI Chat
Companion input region.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `disabled` | `boolean` | `false` | Disables the textarea, send button, and attach button (e.g. during streaming). Shows `NcLoadingIcon` on the send button. |
| `chatAppId` | `string` | `'hermiq'` | Backend app id the attach button uploads files to (`POST /index.php/apps/{chatAppId}/api/chat/attachments`). See `composables/aiChatConfig.js`. |

## Events

| Event | Payload | Description |
|---|---|---|
| `send` | `{ text: string, attachments: Array<{path: string, name: string}> }` | Emitted on Enter (no Shift) or a send-button click with the trimmed textarea content and any uploaded attachment refs. Attachments are cleared afterwards. |

## Attachments

Clicking the paperclip button opens a hidden native file input. The picked
file is uploaded immediately as `multipart/form-data` (field name `file`) to
`chatApiBase(chatAppId)/chat/attachments` via `@nextcloud/axios`:

- **200** — the response `{ path, name }` is added as a removable chip above
  the textarea.
- **400** — the backend's `{ error }` message (oversized file, or a binary
  file that isn't text-decodable) is surfaced inline via `NcNoteCard`; the
  file is *not* silently dropped.

An attachment-only send (no text) is allowed — the send button is only
disabled when there is neither text nor a pending attachment.

## Keyboard Behaviour

- **Enter** — sends the message and clears the textarea
- **Shift+Enter** — inserts a newline without sending
- Send button disabled when the textarea contains only whitespace AND there
  are no attachments

## Accessibility

- `aria-label` on textarea: `t(appName, 'Message input')`
- `aria-label` on send button: `t(appName, 'Send message')`
- `aria-label` on attach button: `t(appName, 'Attach file')`
- `aria-label` on each chip's remove button: `t(appName, 'Remove attachment')`

## Usage

```vue
<CnAiInput :disabled="isStreaming" :chat-app-id="chatAppId" @send="onSend" />
```
