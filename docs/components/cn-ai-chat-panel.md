# CnAiChatPanel

Slide-out conversation panel for the AI Chat Companion — embeds an
`NcAppSidebar` with the message list ([`CnAiMessageList`](./cn-ai-message-list.md))
and the composer ([`CnAiInput`](./cn-ai-input.md)). Rendered by
[`CnAiCompanion`](./cn-ai-companion.md), which owns the stream state.

## Props

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `visible` | Boolean | No | `false` | Controls panel visibility. |
| `streamState` (`stream-state`) | Object | **Yes** | — | The reactive `state` object from [`useAiChatStream()`](../utilities/composables/use-ai-chat-stream.md): `{ isStreaming, currentText, toolCalls, error, messages }`. |
| `fabRef` (`fab-ref`) | Object | No | `null` | Ref to the FAB element — kept for API back-compat; focus return is handled by `NcAppSidebar`. |

## Events

| Event | Payload | Description |
|---|---|---|
| `close` | — | User dismissed the panel. |
| `send` | message text | User submitted a message via `CnAiInput`. |
| `new-thread` | — | User asked to start a fresh conversation. |
| `load-conversation` | conversation uuid | User picked a past conversation from `CnAiHistoryDialog`. |

## Reference

- Implementation: [src/components/CnAiChatPanel/CnAiChatPanel.vue](../../src/components/CnAiChatPanel/CnAiChatPanel.vue)
- Parent: [CnAiCompanion](./cn-ai-companion.md) · Children: [CnAiMessageList](./cn-ai-message-list.md), [CnAiInput](./cn-ai-input.md) · Transport: [useAiChatStream](../utilities/composables/use-ai-chat-stream.md)
