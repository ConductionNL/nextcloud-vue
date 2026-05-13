# CnAiMessageList

Scrollable transcript for the AI Chat Companion — renders the conversation
`messages`, the in-progress streaming text, and tool-call entries. Used inside
[`CnAiChatPanel`](./cn-ai-chat-panel.md).

## Props

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `messages` | Array | No | `[]` | Message objects: `{ role, content, toolCalls? }`. |
| `currentText` (`current-text`) | String | No | `''` | Partial assistant text built from the current token stream; rendered as the last (in-progress) bubble. |

## Slots

| Slot | Description |
|---|---|
| `empty` | Rendered when there are no `messages` and no `currentText` — the "start a conversation" placeholder. |

## Reference

- Implementation: [src/components/CnAiMessageList/CnAiMessageList.vue](../../src/components/CnAiMessageList/CnAiMessageList.vue)
- Parent: [CnAiChatPanel](./cn-ai-chat-panel.md)
