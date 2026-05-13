# CnAiInput

Multi-line textarea + send button for the AI Chat Companion input region.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `disabled` | `boolean` | `false` | Disables both the textarea and send button (e.g. during streaming). Shows `NcLoadingIcon` on the send button. |

## Events

| Event | Payload | Description |
|---|---|---|
| `send` | `string` | Emitted with the trimmed textarea content on Enter (no Shift) |

## Keyboard Behaviour

- **Enter** — sends the message and clears the textarea
- **Shift+Enter** — inserts a newline without sending
- Send button disabled when textarea contains only whitespace

## Accessibility

- `aria-label` on textarea: `t(appName, 'Message input')`
- `aria-label` on send button: `t(appName, 'Send message')`

## Usage

```vue
<CnAiInput :disabled="isStreaming" @send="onSend" />
```
