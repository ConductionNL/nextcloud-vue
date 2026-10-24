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
| `draft` | `{ url }`: the reply can be saved as a draft ("Save as draft" beside Send). On load `GET url` answers `{ text }` into the reply box; saving does `PUT url` with `{ text }` and says when; a reply sent through `endpoint` clears it. `@objectId` in the url is the record; the app owns the endpoint and who may read it. DqZaakContact: `{ "url": "/apps/dossiq/api/cases/@objectId/reply-draft" }`. |
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

## Several lists, templates, reply options, status and message actions

```json
{
  "type": "conversation",
  "content": {
    "fields": [{ "field": "portalReplies", "side": "them" }, { "field": "portalAnswers", "side": "us" }],
    "textField": "message",
    "timeField": "createdAt",
    "endpoint": "/apps/pipelinq/api/tickets/@objectId/answer",
    "templates": { "url": "/apps/pipelinq/api/saved-replies", "params": { "channel": "portal", "ticket": "@objectId" }, "inputLabel": "Saved reply", "textField": "body" },
    "replyOptions": [{ "key": "waitForCustomer", "label": "Also set the ticket to waiting for the customer", "default": true }],
    "statusField": "deliveryStatus",
    "statusMap": { "failed": "Failed" },
    "messageActions": [{ "id": "resend", "label": "Send again", "endpoint": "/apps/pipelinq/api/messages/{id}/resend", "when": { "field": "deliveryStatus", "in": ["failed"] } }]
  }
}
```

| Key | Meaning |
|-----|---------|
| `fields` | Several lists of the record, each on its `side`, merged by time. Instead of `field` or `source`. |
| (page refresh) | A `cn:page:refresh` (a dialog that sent a message) reads `source` again. |
| `usLabel` | Author shown on an `us` message that names none ("Employee"). |
| `templates` | A CnTemplateSelect above the reply box over `url` with `params` (tokens resolved). Picking fills the box with the option's `values[textField]` (default `text`). |
| `replyOptions` | Checkboxes under the reply box. Their values go into the endpoint's body, and as `options` into a `replyAction`'s argument. |
| `statusField` / `statusMap` | The message's status, shown after its channel; `statusMap` turns a stored value into a label. |
| `messageActions` | Buttons on the messages that match `when` (`{ field, in }`, `{ field, equals }`, `{ field, empty: true }`, or a list that must all hold). `errors` (`{ path, map, default, ok? }`) names the answer's refusal by its status; `ok` (default `sent`, `ok`) lists the statuses that are no refusal. The endpoint gets `@objectId` and the message's `{field}` values; after it the messages are read again, and a failure shows `errorText`. |
| `messageActions[].onStatus` | `{ "<status>": <action> }`: when the answer's status (at `errors.path`) is listed, that action runs (dispatched like `headerAction`, `@objectId` and `@object.<field>` resolved) instead of the refusal showing, such as opening the composer with a template when the WhatsApp session closed. |
| `statusBadge` | `{ source: { register, schema, filter?, limit? }, sortField?, path?, map? }`: a badge in the header with the status of the most recent row of that list (by `sortField`), mapped and translated, such as the latest conversation thread's Open, Assigned or Closed. No row, no badge. |

## Reference (auto-generated)

import GeneratedRef from './_generated/CnConversationWidget.md'

<GeneratedRef />
