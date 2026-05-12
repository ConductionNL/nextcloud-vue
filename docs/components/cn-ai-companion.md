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

## Architecture

- Owns the SSE transport via [`useAiChatStream`](../utilities/composables/use-ai-chat-stream.md).
- Reads per-page context via [`useAiContext`](../utilities/composables/use-ai-context.md) (the reactive `cnAiContext` provided by `CnAppRoot`).
- Conversation history is browsed via [`CnAiHistoryDialog`](./cn-ai-history-dialog.md).

## Reference

- Implementation: [src/components/CnAiCompanion/CnAiCompanion.vue](../../src/components/CnAiCompanion/CnAiCompanion.vue)
- Related: [CnAiFloatingButton](./cn-ai-floating-button.md), [CnAiChatPanel](./cn-ai-chat-panel.md), [CnAiMessageList](./cn-ai-message-list.md), [CnAiInput](./cn-ai-input.md), [CnAiHistoryDialog](./cn-ai-history-dialog.md)
