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

## Messages from a list, mapped parts, and a reply action

The messages can also be the objects of a register list filtered on the record, as a case's conversation with the
resident is (board DqZaak, Contact tab). `source` is `{ register, schema, filter?, limit? }`; its filter takes the
record tokens a record-list takes (`"@objectId"`, `"@object.<field>"`), and a filter whose token does not resolve
sends no request. While the list loads the thread says so; an empty list shows `emptyText`. The messages are shown
oldest first by their time.

| Key | Description |
|---|---|
| `bodyField` | Where a message keeps its text (alias of `textField`). |
| `timestampField` | Where it keeps its time (alias of `timeField`). |
| `senderField` | Where it keeps its sender (alias of `authorField`). |
| `directionField` | Where it keeps its direction (alias of `sideField`); a message whose direction equals `outValue` (alias of `usValue`) is one the organisation sent. |
| `channelField` | Where it keeps its channel; `channelMap` turns a stored value into a label (`{ "email": "E-mail" }`), translated. |
| `replyAction` | An action descriptor run on Send instead of posting to `endpoint`; the app decides what sending means. It is dispatched with `args: [{ text, objectId }]` and `props.text` added, tokens resolved; afterwards the list is read again. |
| `channelChips` | `true` draws channel chips above the thread (board DqZaakContact): All, then every `channelMap` label in map order, then any other channel a message uses, each with its count. Choosing one shows only that channel's messages. |
| `headerAction` | A button beside the title, `{ label, icon?, ...action }` (DqZaakContact's "Contact vastleggen"). The label goes through the app's translate; the action is dispatched like `replyAction`, with `args: [{ objectId }]`, and the source is read again after it. |
| `replyHint` | A line beside the reply label saying where the answer goes, through the app's translate ("Goes to the message box in the portal"). |
| `replyOption` | A switch under the reply box, `{ label, key, value? }` (on unless `value` is false). Its state travels with the reply as `{ [key]: boolean }`: in `replyAction`'s `args[0]` and `props`, or in the endpoint's body. DqZaakContact: `{ "label": "Log as a contact moment on this case", "key": "logContactMoment" }`. |
| `subtitle` | A line under the title, through the app's translate ("Oldest first, with the channel of each message"). |
| `usAuthorField` / `themAuthorField` | Who wrote a message, per side; each falls back to `senderField`. A field written `@object.<path>` reads the bound record, such as the case's requester on an incoming message. |
| `usAuthorFormat` / `themAuthorFormat` | `user`: the author is a user id, shown by its display name (the handler who logged an outgoing message). |
| `noteField` | A muted line under the text ("Summarised by Pieter Jansen"). |
| `showDirection` | `true` says the direction before the time, "Incoming · 3 Oct, 14:10"; without it only a screen reader hears it. |

The texts (`title`, `replyLabel`, `placeholder`, `sendLabel`, `emptyText`) go through the app's translate.

```json
{
  "id": "resident-thread",
  "type": "conversation",
  "content": {
    "title": "Conversation with the resident",
    "source": { "register": "zaken", "schema": "message", "filter": { "case": "@objectId" } },
    "directionField": "direction", "outValue": "out",
    "channelField": "channel", "channelMap": { "email": "E-mail", "berichtenbox": "Message box", "phone": "Phone note" },
    "senderField": "sender", "timestampField": "sentAt", "bodyField": "body",
    "emptyText": "No messages with the resident yet.",
    "replyLabel": "Answer the resident",
    "replyAction": { "type": "handler", "handler": "sendResidentMessage" }
  }
}
```

## Reference (auto-generated)

import GeneratedRef from './_generated/CnConversationWidget.md'

<GeneratedRef />
