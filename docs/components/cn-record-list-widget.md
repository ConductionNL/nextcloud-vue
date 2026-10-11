import GeneratedRef from './_generated/CnRecordListWidget.md'

# CnRecordListWidget

The objects of another schema that point at this record, drawn as the relation boards draw them. Registered under the `record-list` widget type.

A person page lists its open cases ("Verlichting fietspad Lindelaan", "2026-0082 · Woo-verzoek", a status pill, "Termijn 1 nov"), its latest contact moments (an icon by channel, a meta line, the summary) and its relations ("Secretaris van Buurtvereniging Oost"). Each is a list of another schema's objects filtered on a reference to this record. The source keys are those of [`object-list`](./cn-object-list-widget.md); what differs is the drawing.

## Content shape

```json
{
  "type": "record-list",
  "title": "Zaken",
  "content": {
    "register": "my-register",
    "schema": "case",
    "filter": { "requester": "@objectId" },
    "sort": { "field": "deadline", "dir": "asc" },
    "limit": 5,
    "presentation": "rows",
    "title": "{title}",
    "meta": "{identifier} · {caseTypeName} · behandelaar {assigneeName}",
    "pill": { "field": "status", "labels": { "in_behandeling": "In behandeling" }, "colorMap": { "in_behandeling": "purple", "afgehandeld": "success" } },
    "trailing": ["Klaar {closedAt|date}", "Termijn {deadline|date}"],
    "rowRoute": "CaseDetail",
    "headerLink": { "label": "Alle {total} zaken bekijken", "route": "Cases", "query": { "requester": "@objectId" } },
    "emptyText": "Nog geen zaken"
  }
}
```

### Source

| Key | Meaning |
|-----|---------|
| `register`, `schema` | The list to read. Without both the widget sends nothing. |
| `filter` | Field filters, with the `@objectId`, `@object.<field>` and `@workspace.<key>` tokens. While a required token has no value the widget sends nothing. An operator is an object: `{ "status": { "ne": "closed" } }`. |
| `sort` | `{ field, dir }`, sent as `_order[field]`. |
| `limit` | How many rows to fetch and draw. Default 5. |
| `extend` | OpenRegister `_extend[]` values, so `{assignee.name}` reads a referenced object. |
| `rowRoute` | A named route; each row links to it with `params.id`. |
| `rowIdField` | Dot path of the id the route receives. Default: the row's own id. A relation row links to its target with `"to.id"`. |

### Drawing

`presentation` is one of:

- `rows` (default): `title` in bold, `meta` under it, a `pill`, a `trailing` text and a chevron. A row with a route is a link. In a detail page's side column the row stacks (title as a link, meta, then pill and date) and drops the chevron, which is the board's "Lopende zaken" card with `limit: 1`.
- `feed`: a round `icon`, a `meta` line and a `text` line. `icon` is an icon name, or `{ field, map, default }` to pick one per row ("phone" to `Phone`).
- `inline`: a `label` followed by the `title`, the title a link when `rowRoute` is set.

Every text is a template. `{path}` reads a dot path off the row; `{path|date}` writes a date the board way ("1 nov", "18 nov 2025"), `{path|datetime}` adds the time ("4 okt, 10:52"). A template with an empty token renders nothing, so `trailing` can list several and the first that fills is shown. Templates go through the host app's translate function first.

`pill` is `{ field, labels?, colorMap?, variant? }`: the label comes from `labels` (translated) or the raw value, the colour from `colorMap` (keyed on the raw value, ignoring case) or `variant`.

### Header

On a card surface the detail page draws the titled card. The widget reports its header through the `header` event, and the card shows it:

| Key | Meaning |
|-----|---------|
| `headerLink` | `{ label, route, params?, query? }` or `{ label, href }`. `{total}` in the label is the list's total; `params` and `query` resolve tokens. |
| `headerNote` | A muted text in the same place, such as `"{total} in totaal"`. |

In a tab panel there is no card header, so neither is drawn.

### States

`emptyText` on one line when the list is empty; one quiet line (`errorText`, else "This list could not be loaded.") when the read fails, never both. The error goes to the console.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The list configuration above. |
| `objectId` | `string\|number` | `null` | The current record's id, for the `@objectId` token. Passed by the detail page host. |
| `objectData` | `object` | `null` | The current record, for `@object.<field>` tokens. Passed by the detail page host. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `header` | `{ link, note }` | After every read: the header link (resolved, or null) and note (or ''). |

<GeneratedRef />
