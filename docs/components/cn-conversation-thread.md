# CnConversationThread

Shows the messages between you and the other party, with a box to answer. Each message has an author, a time and a side: `us` for your organisation, `them` for the resident or customer.

It needs no Talk and no other app. Where the messages are stored is up to you: handle the `send` event, or name an `endpoint` and the reply is posted there.

## Usage

```vue
<CnConversationThread
  title="Contact with the resident"
  reply-label="Answer to the resident"
  :messages="messages"
  @send="saveReply" />
```

```js
messages: [
  { id: 1, author: 'Sanne de Vries', time: '2026-10-04T10:52:00', side: 'them', text: 'Thank you.' },
  { id: 2, time: '2026-10-04T11:00:00', side: 'us', text: 'Construction starts in March.' },
]
```

`time` takes an ISO date, which is shown in the reader's own format. Any other text is shown as is. An `us` message without an author is signed "You".

### Posting to an endpoint

```vue
<CnConversationThread
  :messages="messages"
  endpoint="/apps/dossiq/api/cases/42/messages"
  :payload="{ channel: 'portal' }"
  @sent="reload" />
```

The reply is posted as `{ message, ...payload }`. The box clears when the request succeeds. When it fails, the text stays and an error is announced, so nothing typed is lost.

Press Ctrl+Enter, or Cmd+Enter on a Mac, to send from the keyboard.

### As a widget, from the manifest

The `conversation` widget type reads the messages from a field on the record and maps your field names:

```json
{
  "id": "contact",
  "type": "conversation",
  "content": {
    "title": "Contact with the resident",
    "field": "messages",
    "authorField": "sender",
    "timeField": "sentAt",
    "textField": "body",
    "sideField": "direction",
    "usValue": "outbound",
    "endpoint": "/apps/dossiq/api/cases/@objectId/messages",
    "replyLabel": "Answer to the resident"
  }
}
```

`@objectId` in the endpoint is replaced by the record's id.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `messages` | Array | `[]` | The messages, oldest first: `{ id?, author?, time?, text, side? }`. |
| `title` | String | `''` | Heading of the thread. |
| `titleTag` | String | `'h3'` | Element the heading renders as. |
| `allowReply` | Boolean | `true` | Whether the reply box renders. |
| `replyLabel` | String | `'Reply'` | Label of the reply box. |
| `placeholder` | String | `''` | Placeholder inside the reply box. |
| `sendLabel` | String | `'Send'` | Label of the send button. |
| `usLabel` | String | `'You'` | Author shown on an `us` message that names none. |
| `endpoint` | String | `''` | URL the reply is posted to. Empty means you handle `send` yourself. |
| `payload` | Object | `{}` | Extra fields sent along with `message`. |
| `emptyText` | String | `'No messages yet.'` | Shown when there are no messages. |

### Events

| Event | Payload | When |
|-------|---------|------|
| `send` | the text | A reply is submitted. |
| `sent` | the response body | The endpoint accepted the reply. |
| `error` | the error | The endpoint refused the reply. |

### Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `reply-actions` | `{ draft }` | Extra buttons before Send, for example "Save draft". |

## Accessibility

- The thread is a labelled region and the messages are an ordered list, so their order is announced.
- The side is not said by position and colour alone: every message names its author.
- The reply box has a visible label. A failed send is announced through `role="alert"` and tied to the box.
- The avatar initials are decorative and hidden from assistive technology.

## Related

- [CnDetailPage](./cn-detail-page.md) places the `conversation` widget.
