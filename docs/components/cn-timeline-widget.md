# CnTimelineWidget

An object's dated events in time order, on a detail page. Place it with the
`timeline` widget type.

```json
{
  "type": "timeline",
  "content": {
    "title": "Timeline",
    "fields": [
      { "field": "@self.created", "label": "Booking created" },
      { "field": "depositClearedAt", "label": "Deposit cleared" },
      { "field": "confirmationSentAt", "label": "Confirmation mail sent" },
      { "field": "startsAt", "label": "Starts" },
      { "field": "endsAt", "label": "Ends" }
    ],
    "related": [
      { "schema": "payment", "field": "booking", "label": "Payment received", "titleField": "amount" }
    ],
    "auditTrail": true
  }
}
```

## Sources

All five are optional and end up in one list.

| Key | What it adds |
|-----|--------------|
| `fields` | The object's date properties, `[{ field, label }]`. A dotted path reaches metadata, such as `@self.created`. A field without a date adds nothing. |
| `related` | Related objects, `[{ schema, field, register?, dateField?, label, titleField?, limit? }]`. Rows of `schema` whose `field` holds this object's id, each dated by `dateField` (default `@self.created`). `titleField` becomes the line under the label. |
| `auditTrail` | `true` adds the object's audit trail: "Updated by Ruben". |
| `lists` | A list held on the object, `[{ field, dateField, labelField?, label?, detailField? }]`, such as a status history. Each entry with a date at `dateField` becomes one event, labelled by its `labelField` value (else `label`), with `detailField` as the line under it. |
| `timeline` | `true` adds OpenRegister's timeline of notes, calls and messages. |

`order: "desc"` lists newest first; the default is oldest first.

## Manage mode

`manage: true` replaces the read view with a working view over OpenRegister's
timeline alone (`/objects/{register}/{schema}/{id}/timeline`), newest first with
pinned entries on top:

- kind chips (All, then each kind present, with counts; a plain note has no kind),
  filtering without a second read;
- a visibility filter, pin / unpin, and "Mark as answered" on an open follow-up;
- a note composer with the seeded standard notes (`/timeline/text-blocks`); a
  picked block is sent as `textBlock`, so OpenRegister fills in the object's own
  values;
- Export of the shown entries as CSV;
- `entryActions` that open a modal from the app's registry on one entry.

The read says whether the reader may manage (`canManage`); every control that
writes is drawn only then. A failed read is shown as an error, never as an
empty history.

```json
{
  "type": "timeline",
  "content": {
    "manage": true,
    "title": "History",
    "exportName": "history",
    "entryActions": [
      {
        "id": "reply",
        "label": "Reply",
        "kinds": ["portal-message-in"],
        "modal": "ReplyDialog",
        "props": { "open": true, "recordId": "@objectId", "subject": "@row.fields.subject" },
        "doneEvent": "sent",
        "closesFollowUp": true
      }
    ]
  }
}
```

| Key | Default | Description |
|-----|---------|-------------|
| `manage` | `false` | `true` renders the manage view. |
| `title`, `subtitle` | "History", "What happened, who did it and when, newest first" | Headings (translated through the app). |
| `publicLabel` | "Visible to the applicant" | Label of the public badge, filter option and composer switch. |
| `exportName` | `history` | CSV file name prefix; the object id is appended. |
| `composer` | `true` | `false` hides the note composer. |
| `textBlocks` | `true` | `false` skips the standard notes. |
| `entryActions` | `[]` | `{ id, label, kinds?, modal, props?, doneEvent?, closesFollowUp? }`. `modal` names a registry entry; `props` resolve `@objectId` and `@row.<path>`. On `doneEvent` (default `done`) an open follow-up is closed when `closesFollowUp` is set, else the timeline is read again; `close` dismisses. |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `object` | Object | `null` | The object whose events the widget shows. |
| `title` | String | `''` | Card title override. |
| `content` | Object | `{}` | Stored widget content: `{ title, fields, related, auditTrail, timeline, order }`. |
| `apiBase` | String | `'/apps/openregister/api'` | OpenRegister API base the widget reads related objects, the audit trail and the timeline from. |

## Behaviour

- Labels are authored in English and pass through the app's translation.
- A calendar date shows as a date, a moment as date and time, in the reader's language.
- A moment after now shows a hollow dot and the word "Upcoming".
- Each source loads on its own. When one fails, a warning names it and the rest still show.
- With no dated facts the widget says "Nothing has happened yet."

The object comes from the detail page, as for `audit-trail`: explicit
`register`, `schema`, `objectId` and `object` props win, then the page's
object context, then `content`. When only the id is known, the widget fetches
the object.

## Related

- [CnAuditTrailCard](./cn-audit-trail-card.md) for the change log alone.
- [CnTimelineStages](./cn-timeline-stages.md) for a status progression.

## Items from an app endpoint, with type chips

An app that merges its own sources answers them from one endpoint. `endpointSource` reads it a page at a time, and `typeChips` narrow it on the server:

```json
{ "type": "timeline", "content": {
  "order": "desc",
  "endpointSource": {
    "url": "/apps/pipelinq/api/timeline",
    "params": { "entityType": "client", "entityId": "@objectId" },
    "itemsPath": "items", "pagesPath": "pages",
    "dateField": "date", "labelField": "title", "detailField": "description",
    "typeField": "type", "userField": "user",
    "typeLabels": { "interaction": "Contact moment", "task": "Task" },
    "typesParam": "types[]", "limit": 20
  },
  "typeChips": [{ "value": "interaction", "label": "Contact moments" }, { "value": "task", "label": "Tasks" }]
} }
```

Each item becomes an event: the label (an item without one reads "(no title)"), the detail cut at 120 characters, and a meta line of its type label and author. `pageParam` (default `_page`) and `limitParam` (default `_limit`) name the paging parameters; "Load more" reads the next page while the answer's `pages` is higher. A chip sends its value in `typesParam` and reads from page 1; All sends none. A failed read says that the activities could not load.

