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
| `defaultAgent` (`default-agent`) | String | No | `''` | The agent to start on, by uuid or name (case-insensitive); wins over the page-relevance default until the user picks an agent, and is followed when it changes. |

## Events

| Event | Payload | Description |
|---|---|---|
| `close` | — | User dismissed the panel. |
| `send` | message text | User submitted a message via `CnAiInput`. |
| `new-thread` | — | User asked to start a fresh conversation. |
| `load-conversation` | conversation uuid | User picked a past conversation from `CnAiHistoryDialog`. |

## Reference

- Implementation: [src/components/CnAiChatPanel/CnAiChatPanel.vue](https://github.com/ConductionNL/nextcloud-vue/blob/main/src/components/CnAiChatPanel/CnAiChatPanel.vue)
- Parent: [CnAiCompanion](./cn-ai-companion.md) · Children: [CnAiMessageList](./cn-ai-message-list.md), [CnAiInput](./cn-ai-input.md) · Transport: [useAiChatStream](../utilities/composables/use-ai-chat-stream.md)

## Approved-assistant mark

When thematiq is installed, the panel reads `GET /apps/thematiq/api/assistant-mark` once per page load and, if the mark is on, draws a footer row (`role="note"`) under the input with the organisation's logo (max 24px high, the response's `alt`) and its label, shown exactly as received. The row appears in both the chat and history views. With thematiq absent, the mark off, or any failure, no row is rendered. No prop is involved. The label uses `--color-main-text` on `--color-main-background`.

## Sessions about the page

When `context` names a file (`fileId`) or a record (`objectUuid`), the panel asks the backend for the sessions linked to it (`GET {chatApiBase}/conversations?linkedType=&linkedId=`) on mount, when the entity changes, and whenever the sessions menu opens. If there are any, the sessions menu lists them under "Sessions about {label}", with the label from the response's `scope`; otherwise it keeps "Recent conversations". "View all conversations" always opens the unscoped history.

While a session is open, a "Session settings" titlebar entry lists the session's `links` (`{ type, id, label }`) and removes one with `DELETE {chatApiBase}/sessions/{uuid}/links?type=&id=`. A removed link takes the session out of that entity's scoped list.
