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
| `endpointSource` | Read the rows from an app endpoint instead: `{ url, method?, params?, responsePath? }`, the shape the object table and the stat tile take. The payload at `responsePath` is the array of rows; a payload that is not an array is an empty list. `register`, `schema`, `filter` and `sort` are then not used. |
| `filter` | Field filters, with the `@objectId`, `@object.<field>` and `@workspace.<key>` tokens. While a required token has no value the widget sends nothing. An operator is an object: `{ "status": { "ne": "closed" } }`. |
| `sort` | `{ field, dir }`, sent as `_order[field]`. |
| `limit` | How many rows to fetch and draw. Default 5. |
| `offset` | How many rows of the list to skip first. Default 0. Two cards over one list read "next" (`limit: 1`) and "after that" (`offset: 1`) without a row twice. Not applied to a `rank` sort. |
| `extend` | OpenRegister `_extend[]` values, so `{assignee.name}` reads a referenced object. |
| `rowRoute` | A named route; each row links to it with `params.id`. |
| `rowIdField` | Dot path of the id the route receives. Default: the row's own id. A relation row links to its target with `"to.id"`. |

### Drawing

`presentation` is one of:

- `rows` (default): `title` in bold, `meta` under it, a `pill`, a `trailing` text and a chevron. A row with a route is a link. In a detail page's side column the row stacks (title as a link, meta, then pill and date) and drops the chevron, which is the board's "Lopende zaken" card with `limit: 1`.
- A `rows` list can lead with an avatar: `avatar` is a name template (`"{client.name}"`, or `{ "text": "{client.name}" }`), drawn as a 36px circle with the initials of its first and last word ("Sanne de Vries" reads "SV"). A row whose name is empty has no circle. The second line is `meta`: `"meta": "{client.name} · {channel}"` with `"extend": ["client"]` puts the customer under the title. The circle is decoration (`aria-hidden`); the name is in the meta text.
- `feed`: a round `icon`, a `meta` line and a `text` line. `icon` is an icon name, or `{ field, map, default }` to pick one per row ("phone" to `Phone`).
- `inline`: a `label` followed by the `title`, the title a link when `rowRoute` is set.
- `cards`: a framed card per row in a grid of cards at least 240px wide, as board ShBank draws the bank accounts. The card shows the `icon` (only when you set one) and the `title`, with the `pill` and `badges` beside them, then the `meta` line, then `trailing` as a large figure. A card with `rowRoute` is a link. On a board-look dashboard the cards keep a 24px inset inside a titled card; give the placement `borderless: true` and `showTitle: false` to stand them on the page ground, as ShBank does.

Every text is a template. `{path}` reads a dot path off the row; `{path|date}` writes a date the board way ("1 nov", "18 nov 2025"), `{path|datetime}` adds the time ("4 okt, 10:52"). `{path|relative}` says "vandaag" and "gisteren" and then the short date, and `{path|relativetime}` adds the time of day ("vandaag, 09.42"). A template with an empty token renders nothing, so `trailing` can list several and the first that fills is shown. Templates go through the host app's translate function first.

`pill` is `{ field, labels?, colorMap?, variant? }`: the label comes from `labels` (translated) or the raw value, the colour from `colorMap` (keyed on the raw value, ignoring case) or `variant`.

### A colour dot and flags

`dot` draws a 14px colour dot before a row's title, as board DqZaaktypeOverzicht draws a case type's statuses: a field name (`"dot": "color"`) whose value is the colour, or `{ "field": "tone", "colorMap": { "error": "var(--color-error)" } }`. Only a hex, `rgb()`/`hsl()` or `var(--…)` colour is drawn. `flags` draws short labels at the row's end for the flags a row has: `[{ "field": "isStart", "label": "Start" }, { "field": "isEnd", "label": "End" }]` shows "Start" on a row whose `isStart` is true, and with `value` a flag holds when the field equals it. Labels go through the app's translate and join with " · ".

### One action per row

`rowAction` ends every `rows` row with one action, drawn as a 150px by 34px pill, as board DcMijnActies draws "Beoordelen" and "Stem uitbrengen". The title becomes the row's link (with `rowRoute`) and the chevron goes.

- It is a manifest action plus a `label`: `open-page` opens that page for the row's id, `navigate` reads `@object.<field>` and `@objectId` off the row (`"/votes/@object.id"`). Both render as links. Any other type is a button that runs through the page's dispatcher: a `handler` gets the row as its last argument, `open-modal` gets it as the `row` prop.
- `labels: { field, map }` picks the label per row: `{ "field": "status", "map": { "open": "Starten" } }` reads "Starten" for an open item and `label` ("Afronden") for the rest.

### Several actions per row, and links onwards

`rowActions` ends every `rows` row that opens nothing with an actions menu (named by `rowActionsLabel`). An entry is a
page action plus a `label`, dispatched as `rowAction` is (an `open-modal` gets the row as its `row` prop and its own
`props` with `@objectId` resolved), or `{ label, endpoint, method? }`: an app URL with the page's `@objectId` and the
row's `{field}` tokens filled in. After an endpoint call the list reads again; a refusal shows the server's sentence as
an alert (else `errorText`).

A `set-field` entry (`{ type: "set-field", field, value, label, ariaLabel?, doneLabel?, errorText? }`) is not in the
menu: each row gets a button that writes `field` of the page's record with one PATCH, `value` read from the row
(`"{userId}"`). The saved record goes back to the page (`cnObjectContext.setObject`) and the list reads again. The row
whose value the record already holds shows `doneLabel` with a check instead of the button ("Assigned"). `ariaLabel` is a
template filled from the row ("Assign to {displayName}").

`footnote` may be `{ path, text }` instead of a text: it reads `path` of the same endpoint answer the rows come from
(one request, through the endpoint cache) and fills `{value}` into `text` ("{value} matching colleagues at
capacity"). It shows with no rows too, and not when the value is empty or zero.

`links` (`{ field, label, route, labelSource?, fallback? }`) draws a line under the row naming the records at `field`
("Also on: 2026-0012 Parkeren, 2026-0031"). Each links to `route` with `{value}` the id; `labelSource`
(`{ register, schema, template }`) reads their labels, ten at most, and `fallback` stands in until then.

A badge with `kind: "count"` (`{ field, one, other }`, `{count}` filled in) counts a list or a number on the row, and
shows nothing at 0.

`requiresApp` names the app the rows come from. When it is not installed the list says `absentText` and reads nothing,
so "not installed" is never shown as "nothing yet". `intro` is a line above the list. A template may be a list of
candidates (`"title": ["{summary}", "{subject}"]`): the first that fills.

### An action under the list

`footerAction` ends the card with one secondary button, also under the empty text, as board DqBezwaar draws "Beroep registreren" in its Beroep card. It is a manifest action plus a `label` and an optional `icon`, run through the page's dispatcher with the page's record as `@object`. `disabledWhen` is a visibleWhen condition (a `field` on the page's record, the workspace, an endpoint or a source; `total` reads the list's total): while it holds the button is disabled and `disabledReason` shows under it, tied to the button with `aria-describedby`. Label and reason go through the app's translate.

```json
"footerAction": {
  "label": "Register appeal",
  "icon": "Gavel",
  "type": "open-form",
  "schema": "beroep",
  "disabledWhen": { "field": "decisionSent", "op": "neq", "value": true },
  "disabledReason": "Possible once the decision is sent"
}
```

### Header

On a card surface the detail page or the dashboard page draws the titled card. The widget reports its header through the `header` event, and the card shows it:

| Key | Meaning |
|-----|---------|
| `headerLink` | `{ label, route, params?, query? }` or `{ label, href }`. `{total}` in the label is the list's total; `params` and `query` resolve tokens. |
| `headerNote` | A muted text in the same place, such as `"{total} in totaal"`. `{count:<field>=<value>}` counts the loaded rows whose field reads that value: `"{count:status=done} van {total} stappen klaar"`. It reads the rows the list loaded, so set `limit` to cover the list. |
| `headerCount` | `true` reports the list's total, which the dashboard card draws as a chip after its title ("Actiepunten 5"). |

In a tab panel there is no card header, so neither is drawn.

### A meta line of parts

`meta` as a string is one template: a row that misses one of its tokens gets no meta line at all. For a line built from fields that may be empty, list the parts: `"meta": { "parts": ["{identifier}", "{caseTypeName}", "{handler.name}"], "separator": " · " }`. Each part is filled on its own, the empty ones are left out and the rest are joined by `separator` (default " · "). A part can hold text and formats, such as `"Termijn {deadline|date}"`.

### States

A list that asks for a personal lens (`filter: { "_recent": true }`) and gets none back because the lens could not answer says why in place of `emptyText`: "This server does not keep track of what you open.", "Log in to see what you opened recently." or "Your recent items are not available right now.". `lensReasonTexts` replaces the wording, keyed by `<lens>.<reason>` or `<reason>`, such as `{ "recent.audit-trail-disabled": "Recent cases need the audit trail." }`; the text goes through the host's translate. A lens that is available, or a reason without text, keeps `emptyText`.

`emptyText` on one line when the list is empty; one quiet line (`errorText`, else "This list could not be loaded.") when the read fails, never both. The error goes to the console.

### A label for a stored value

`valueLabels` maps a field's stored values to labels the templates show: `"valueLabels": { "channel": { "phone": "Phone", "telefoon": "Phone", "email": "Email" } }` makes `"{channel}"` read the translated label ("Telefoon" for both spellings). A value the map does not name is shown as stored. The pill, the badges and the sort keep the stored value.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The list configuration above. |
| `objectId` | `string\|number` | `null` | The current record's id, for the `@objectId` token. Passed by the detail page host. |
| `objectData` | `object` | `null` | The current record, for `@object.<field>` tokens. Passed by the detail page host. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `header` | `{ link, note, count? }` | After every read: the header link (resolved, or null), the note (or ''), and with `headerCount` the total. |

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

`due` draws a date field as text with a tone: `{ "field": "deadline", "todayLabel": "Vandaag", "overdueLabel": { "one": "{count} dag te laat", "other": "{count} dagen te laat" }, "emptyText": "Geen deadline" }`. A date before today reads the overdue label in the danger colour, today reads `todayLabel` (default "Due today"), a day to come reads "tomorrow" or the short date, and an empty field reads `emptyText` in the muted colour, or nothing without one. With `upcomingLabel` (`{ "one": "nog {count} dag", "other": "nog {count} dagen" }`) a day to come reads the days left instead of the date, and with `upcomingWeeksLabel` (`{ "one": "nog {count} week", "other": "nog {count} weken" }`) it reads the weeks left, rounded, from `upcomingWeeksFrom` days left (default 35). The texts go through the host's translate. The same keys work on a `date` column as `widgetProps.due`.

## A bar under each row

`bar` draws a thin track under each row of the `rows` presentation. With `valueField` alone the track is filled to the row's share of the largest row (board DqTeamwachtrij "Team vandaag": cases per colleague). With `maxField` it is filled to the row's value against its own maximum, and `overVariant: "error"` draws it in the error colour once the value is past that maximum (board PqWachtrij "Team vandaag": open tickets against `maxConcurrent`). The track is a `meter` named after the row's title.

```json
{
  "avatar": "{displayName}",
  "title": "{displayName}",
  "meta": "{availability}",
  "trailing": "{open} open",
  "bar": { "valueField": "open", "maxField": "maxConcurrent", "overVariant": "error" }
}
```

## Money

`{amount|currency}` writes an amount as money, `{amount|currency:USD}` in the named currency, and `{amount|currency:price.code}` in the currency the row holds at that field. A row without a code, and the bare `{amount|currency}`, take the app's reporting currency (`currency` in the app config) and euros without one. The number follows the user's language ("€ 12.000,00" for Dutch). A row without an amount empties the template, as for every token.

## Sort by the rank of an enum

A text field sorts alphabetically on the server, so priority reads high, low, normal, urgent. A sort with `rank` puts the values in your order: `"sort": { "field": "priority", "rank": ["urgent", "high", "normal", "low"], "then": { "field": "slaDeadline", "dir": "asc" } }`, and the same object works as an entry of `pageControls.sort.map`. The list reads the rows one value at a time, best first, each group in the order of `then`, until `limit` rows are in; rows with another value or none come last. The rows shown are the first `limit` of the whole filtered list and `{total}` counts all of them. It costs up to one request per value plus two, where a plain sort costs one. A list whose `filter` already fixes the field ignores `rank`. Only the record list does this: the object table and index pages page through their rows and ignore `rank`.

## Rows that are plain strings

An endpoint may answer a list of strings (`["…", "…"]`). Each is read as `{ value }`: a template reaches it as `{value}`, and a list without `title` shows the value itself.

`presentation: "notice"` draws the rows as one paragraph in a toned box (`role="note"`), after an optional `lead` with `{total}` filled in. `variant` is `info` (default), `warning` or `error`.

```json
{
  "type": "record-list",
  "title": "Controle",
  "content": {
    "endpointSource": { "url": "/apps/dossiq/api/case-types/@objectId/publish/validate", "responsePath": "warnings" },
    "presentation": "notice",
    "variant": "warning",
    "lead": "{total} warnings:",
    "emptyText": "No warnings"
  }
}
```
