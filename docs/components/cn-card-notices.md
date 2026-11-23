# CnCardNotices

The state banners at the top of a card, table, dialog or list page (R1): what just happened to it, in the server's words, where the board draws it. DqZaakTaken draws "Taak afgerond. U blijft op de zaak" and "Annuleren geweigerd ..." above the task table; DqTeamwachtrij "Bron niet beschikbaar: taken uit pipelinq."; DqZaken "2 zaken naar In behandeling verplaatst." with "Mislukte acties bekijken".

Each entry is a [`notice` content](./cn-notice-widget.md) plus an optional `visibleWhen`, drawn with `inline` on.

## Where notices go

| Surface | How |
|---------|-----|
| A detail page widget | `notices: [ ... ]` on the widget definition, beside `title` and `headerActions`. Drawn at the top of the card body. |
| An index page | `config.notices: [ ... ]`, drawn above the list card. |
| CnWidgetWrapper, CnDetailCard, CnDataTable | prop `notices` (Array) and slot `#notice`; events `notice-action` `(entry, notice)` and `notice-dismiss` `(notice)`. |
| CnDialog | prop `notices`, slot `#notice`, and `noticesPlacement`: `top` (under the header, default) or `bottom` (above the footer buttons). |

```json
{
  "id": "case-tasks",
  "type": "record-list",
  "title": "Tasks on this case",
  "notices": [
    { "variant": "warning", "text": "Waiting on advice from {adviser}.", "visibleWhen": { "field": "status", "value": "waiting-advice" } }
  ]
}
```

A notice shows while its `visibleWhen` holds against the card's record. The async grammar applies, so a `source` count works: `{ "source": { "register": "dossiq", "schema": "advice", "filter": { "case": "@objectId", "outcome": "negative" } }, "op": "gt", "value": 0 }` shows a notice while the case has a negative advice. A closed notice stays away until the list changes.

## Action answers in the card

An `api-call`, `agent` or run-node action run from a detail card (or a row of an index page) shows its answer in that card instead of a toast when:

1. the response body carries `notice`, on success or refusal:

   ```json
   { "message": "Cancel refused", "notice": { "variant": "error", "title": "Cancel refused for Review documents:", "text": "the engine does not allow it while the step Review runs." } }
   ```

2. or the action sets `"noticeInline": true`: a refusal becomes an error notice in the server's message, a success a success notice with the action's `successMessage`.

Without either the toast is shown as before. The next action from the same card clears the earlier answer; the notice can be closed.

## The page channel

A component that finishes something for the page (a dialog that moved a selection) raises a notice on the `@nextcloud/event-bus` channel `cn:page:notice`:

```js
import { emit } from '@nextcloud/event-bus'
emit('cn:page:notice', { notice: { variant: 'warning', title: '2 cases moved.', text: '1 without all of its actions.' } })
// one card of a detail page:
emit('cn:page:notice', { widgetId: 'case-tasks', notice: { variant: 'success', text: 'Task completed.' } })
```

Without `widgetId` the index page takes it; with one, the detail card of that widget.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `notices` | Array | `[]` | The notices, in order. |
| `objectData` | Object | `null` | The record `visibleWhen` fields and `{path}` placeholders read. |
| `objectId` | String \| Number | `''` | The record id, for `@objectId` in a condition. |

## Events

| Event | Payload |
|-------|---------|
| `notice-action` | `(entry, notice)`: a notice button was pressed. |
| `notice-dismiss` | `(notice)`: a notice was closed. |

The board look draws them 10px 14px inside a radius-10 ground at 14px, the card's 22px inset beside them in a flush card, and a tone per variant (`--cn-board-success-tint`, `--cn-board-red-tag-ground`, `--cn-board-notice-bg`, `--cn-board-notice-info-ground`).
