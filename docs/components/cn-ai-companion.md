# CnAiCompanion

The AI Chat Companion shell. Auto-mounts at the end of `NcContent`'s children
(via `CnAppRoot`) and renders a floating action button (`CnAiFloatingButton`)
plus a slide-out chat panel (`CnAiChatPanel`) — gated by an OpenRegister health
probe and the active `cnAiContext`. No per-app wiring is required; it surfaces
whenever the OpenRegister chat backend is reachable.

## Props

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `position` | String | No | `'bottom-right'` | Viewport corner at which the FAB and panel anchor. Forwarded to `CnAiFloatingButton`. |
| `chatAppId` | String | No | `'openregister'` | Backend app id the chat/agent endpoints resolve against (see [`chatApiBase`](../utilities/chat-api-base.md) / [`DEFAULT_CHAT_APP_ID`](../utilities/default-chat-app-id.md)). Passed through to [`useAiChatStream`](../utilities/composables/use-ai-chat-stream.md) so a deployment can point the companion at another backend (e.g. `hermiq`). |
| `embedded` | Boolean | No | `false` | Render the chat as a panel of the page (a tab, a card) instead of the launcher hex and its floating window. An embedded chat is always open, has no launcher, and does not take the page's single companion slot, so the floating companion keeps working beside it. |
| `titled` | Boolean | No | `false` | An embedded chat in a card that draws its title: the panel drops its own titlebar and reports its controls through `menu`. |
| `note` | String | No | `''` | A line above the input, already translated. |
| `inputPlaceholder` | String | No | `''` | The input's placeholder, already translated. |
| `sendLabel` | String | No | `''` | A label on the send button, already translated. |

## Architecture

- Owns the SSE transport via [`useAiChatStream`](../utilities/composables/use-ai-chat-stream.md).
- Reads per-page context via [`useAiContext`](../utilities/composables/use-ai-context.md) (the reactive `cnAiContext` provided by `CnAppRoot`).
- Conversation history is browsed via [`CnAiHistoryDialog`](./cn-ai-history-dialog.md).

## Reference

- Implementation: [src/components/CnAiCompanion/CnAiCompanion.vue](../../src/components/CnAiCompanion/CnAiCompanion.vue)
- Related: [CnAiFloatingButton](./cn-ai-floating-button.md), [CnAiChatPanel](./cn-ai-chat-panel.md), [CnAiMessageList](./cn-ai-message-list.md), [CnAiInput](./cn-ai-input.md), [CnAiHistoryDialog](./cn-ai-history-dialog.md)
