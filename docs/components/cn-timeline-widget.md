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

All four are optional and end up in one list.

| Key | What it adds |
|-----|--------------|
| `fields` | The object's date properties, `[{ field, label }]`. A dotted path reaches metadata, such as `@self.created`. A field without a date adds nothing. |
| `related` | Related objects, `[{ schema, field, register?, dateField?, label, titleField?, limit? }]`. Rows of `schema` whose `field` holds this object's id, each dated by `dateField` (default `@self.created`). `titleField` becomes the line under the label. |
| `auditTrail` | `true` adds the object's audit trail: "Updated by Ruben". |
| `timeline` | `true` adds OpenRegister's timeline of notes, calls and messages. |

`order: "desc"` lists newest first; the default is oldest first.

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
