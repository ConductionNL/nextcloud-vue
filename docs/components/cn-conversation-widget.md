# CnConversationWidget

The `conversation` widget: a [CnConversationThread](./cn-conversation-thread.md) fed from a list on the bound record, in a bordered card. A reply the endpoint accepts shows at once, until the record is read again.

The widget registers itself as the `conversation` type, so a manifest places it by that key. It is also a named export, for an app component that renders it with its own props:

```js
import { CnConversationWidget } from '@conduction/nextcloud-vue'
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | `{ field, endpoint?, authorField?, timeField?, textField?, sideField?, usValue?, title?, allowReply?, replyLabel?, placeholder?, sendLabel?, emptyText? }`. `field` is the dot path to the messages on the record (default `messages`); the `*Field` keys name each message's author, time, text and side. A message whose side equals `usValue` (default `us`) is drawn as ours. `@objectId` in `endpoint` is replaced by the record's id. |
| `objectData` | `object` | `null` | The bound record. |
| `objectId` | `string` \| `number` | `''` | The bound record's id, used in `endpoint`. |

## Reference (auto-generated)

import GeneratedRef from './_generated/CnConversationWidget.md'

<GeneratedRef />
