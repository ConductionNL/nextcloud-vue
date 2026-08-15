# CnAiChatPanel

Slide-out chat panel for the AI Chat Companion. Anchored to the right viewport edge.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `visible` | `boolean` | `false` | Controls panel visibility. The panel transitions in from the right when set to `true`. |
| `streamState` | `object` | required | Reactive state object from `useAiChatStream().state`. Contains `isStreaming`, `currentText`, `toolCalls`, `error`, `messages`. |
| `fabRef` | `object` | `null` | Ref to the FAB element. Focus is returned here on close (WCAG 2.4.3). |
| `chatAppId` | `string` | `'hermiq'` | Backend app id, forwarded to the agent picker, recent sessions, history list, and `CnAiInput`'s attach control. See `composables/aiChatConfig.js`. |

## Events

| Event | Payload | Description |
|---|---|---|
| `close` | — | Emitted on Close button click, Escape key, or outside-click with empty input |
| `send` | `(text: string, agentUuid: string, attachments: Array<{path: string, name: string}>)` | Re-emitted from `CnAiInput`'s `{ text, attachments }` payload plus the currently-selected agent uuid |
| `new-thread` | — | Emitted when the "Start new chat" button is clicked |
| `load-conversation` | `string` (UUID) | Emitted when the user selects a conversation from `CnAiHistoryDialog` |

## Focus management

- On `visible = true`: focus moves to the message-input textarea.
- On close: focus returns to `fabRef` (WCAG 2.4.3 Focus Order).
- History dialog close: focus returns to the History button.

## Panel dimensions

- Desktop: `min(420px, 100vw - 32px)`
- Mobile (<512px): `100vw`
- Top: aligned to `var(--header-height, 50px)` so the panel does not overlap the Nextcloud header.
- z-index: `9000` (above standard Nextcloud chrome, below modals).

## Usage

```vue
<CnAiChatPanel
  :visible="isPanelOpen"
  :stream-state="stream.state"
  :fab-ref="$refs.fabButton"
  @close="isPanelOpen = false"
  @send="(text, agentUuid, attachments) => stream.send(text, { agentUuid, attachments })"
  @new-thread="stream.startNewThread()"
  @load-conversation="stream.loadConversation($event)" />
```
