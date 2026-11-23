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

- Implementation: [src/components/CnAiInput/CnAiInput.vue](https://github.com/ConductionNL/nextcloud-vue/blob/main/src/components/CnAiInput/CnAiInput.vue)
- Parent: [CnAiChatPanel](./cn-ai-chat-panel.md)

## Attaching files

The paperclip opens a small menu. **Upload from device** uploads one file to the chat backend and adds a chip with `{ path, name }`. **Choose from Files** opens the Nextcloud file picker for several files and adds a chip for each with `{ fileId, path, name }`; those files are sent by id and never uploaded. `send` carries `{ text, attachments }`, where each attachment is one of the two shapes. Backends that ignore `fileId` keep working with `path`.
