# CnAiInput

Composer for the AI Chat Companion — the text area + send control at the bottom
of [`CnAiChatPanel`](./cn-ai-chat-panel.md).

## Props

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `disabled` | Boolean | No | `false` | Whether the input controls are disabled (e.g. while a response is streaming). |

## Events

| Event | Payload | Description |
|---|---|---|
| `send` | message text | Emitted when the user submits a message. |

## Reference

- Implementation: [src/components/CnAiInput/CnAiInput.vue](../../src/components/CnAiInput/CnAiInput.vue)
- Parent: [CnAiChatPanel](./cn-ai-chat-panel.md)
