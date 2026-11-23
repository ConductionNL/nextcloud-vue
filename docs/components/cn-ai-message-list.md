# CnAiMessageList

Scrollable transcript for the AI Chat Companion — renders the conversation
`messages`, the in-progress streaming text, and tool-call entries. Used inside
[`CnAiChatPanel`](./cn-ai-chat-panel.md).

## Props

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `messages` | Array | No | `[]` | Message objects: `{ role, content, toolCalls?, attachments?, attachmentNotices? }`. |
| `currentText` (`current-text`) | String | No | `''` | Partial assistant text built from the current token stream; rendered as the last (in-progress) bubble. |

## Slots

| Slot | Description |
|---|---|
| `empty` | Rendered when there are no `messages` and no `currentText` — the "start a conversation" placeholder. |

## Reference

- Implementation: [src/components/CnAiMessageList/CnAiMessageList.vue](https://github.com/ConductionNL/nextcloud-vue/blob/main/src/components/CnAiMessageList/CnAiMessageList.vue)
- Parent: [CnAiChatPanel](./cn-ai-chat-panel.md)

## Attachments and notices

A message may carry `attachments` (`{ name, fileId?, mimeType?, size? }[]`) and an assistant message may carry `attachmentNotices` (`string[]`). Attachments on a question show as chips under it. On an answer, an `image/*` attachment with a `fileId` shows as a Nextcloud preview thumbnail linked to the file in Files (opens in a new tab); other attachments show as chips (linked when they have a `fileId`). Each notice shows as one line above the answer. Messages without these fields render as before. `useAiChatStream` fills both from the `final` frame.
