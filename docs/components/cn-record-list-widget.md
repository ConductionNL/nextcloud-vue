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
- A `rows` list can lead with an avatar: `avatar` is a name template (`"{client.name}"`, or `{ "text": "{client.name}" }`), drawn as a 36px circle with the initials of its first and last word ("Sanne de Vries" reads "SV"). A row whose name is empty has no circle. The second line is `meta`: `"meta": "{client.name} · {channel}"` with `"extend": ["client"]` puts the customer under the title. The circle is decoration (`aria-hidden`); the name is in the meta text.
- `feed`: a round `icon`, a `meta` line and a `text` line. `icon` is an icon name, or `{ field, map, default }` to pick one per row ("phone" to `Phone`).
- `inline`: a `label` followed by the `title`, the title a link when `rowRoute` is set.

Every text is a template. `{path}` reads a dot path off the row; `{path|date}` writes a date the board way ("1 nov", "18 nov 2025"), `{path|datetime}` adds the time ("4 okt, 10:52"). `{path|relative}` says "vandaag" and "gisteren" and then the short date, and `{path|relativetime}` adds the time of day ("vandaag, 09.42"). A template with an empty token renders nothing, so `trailing` can list several and the first that fills is shown. Templates go through the host app's translate function first.

`pill` is `{ field, labels?, colorMap?, variant? }`: the label comes from `labels` (translated) or the raw value, the colour from `colorMap` (keyed on the raw value, ignoring case) or `variant`.

### Header

On a card surface the detail page or the dashboard page draws the titled card. The widget reports its header through the `header` event, and the card shows it:

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

## Page controls

A list can follow the page's controls (a `workspace-filter` select and switch). Without `pageControls` it ignores them.

```jsonc
"pageControls": {
  "sort":   { "key": "sort", "map": { "deadline": { "field": "slaDeadline", "dir": "asc" }, "priority": { "field": "priority", "dir": "desc" } } },
  "toggle": { "key": "showDone", "removes": ["status"] }
}
```

`sort`: the workspace value at `key` picks an entry of `map`; a value with no entry leaves the list's own `sort`. `toggle`: while the value at `key` is on (true, 1, "1", "true"), the filter keys in `removes` are dropped, so a list that hides finished work shows it. The list fetches again when either changes.

## Badges

`badges` adds status badges after the row's pill. A field badge takes the same keys as `pill` (`field`, `labels`, `colorMap`, `variant`) plus `hideValues`, a list of values that draw nothing, so a priority badge shows for urgent and high and stays away for normal. An age badge, `{ "kind": "stale", "field": "updatedAt", "afterDays": 7, "label": "Stale {days} days", "variant": "warning" }`, shows when the date field is more than `afterDays` whole days old and replaces `{days}` with the age. `pill.hideValues` hides the pill the same way.
## Due text

`due` draws a date field as text with a tone: `{ "field": "deadline", "todayLabel": "Vandaag", "overdueLabel": { "one": "{count} dag te laat", "other": "{count} dagen te laat" }, "emptyText": "Geen deadline" }`. A date before today reads the overdue label in the danger colour, today reads `todayLabel` (default "Due today"), a day to come reads "tomorrow" or the short date, and an empty field reads `emptyText` in the muted colour, or nothing without one. The texts go through the host's translate. The same keys work on a `date` column as `widgetProps.due`.

## Money

`{amount|currency}` writes an amount as money, `{amount|currency:USD}` in the named currency, and `{amount|currency:price.code}` in the currency the row holds at that field. A row without a code, and the bare `{amount|currency}`, take the app's reporting currency (`currency` in the app config) and euros without one. The number follows the user's language ("€ 12.000,00" for Dutch). A row without an amount empties the template, as for every token.

## Sort by the rank of an enum

A text field sorts alphabetically on the server, so priority reads high, low, normal, urgent. A sort with `rank` puts the values in your order: `"sort": { "field": "priority", "rank": ["urgent", "high", "normal", "low"], "then": { "field": "slaDeadline", "dir": "asc" } }`, and the same object works as an entry of `pageControls.sort.map`. The list reads the rows one value at a time, best first, each group in the order of `then`, until `limit` rows are in; rows with another value or none come last. The rows shown are the first `limit` of the whole filtered list and `{total}` counts all of them. It costs up to one request per value plus two, where a plain sort costs one. A list whose `filter` already fixes the field ignores `rank`. Only the record list does this: the object table and index pages page through their rows and ignore `rank`.
