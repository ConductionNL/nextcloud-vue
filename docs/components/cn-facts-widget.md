# CnFactsWidget

A card of facts about ONE object: label/value rows, a bold title line that may link, muted meta lines, a status pill, and one link at the foot. Registered under the `facts` widget type.

It is the side card the screens draw on almost every detail page (a portal's domain, theme and status; a task's owner, team and deadline; the case a task belongs to). Before this widget each app drew that card with its own component. Now an app declares which fields of which object it shows, and the library draws the card.

The object is the current detail-page object, or one other object named by `source`. Nothing in the widget knows an app.

## Content shape

```json
{
  "type": "facts",
  "title": "Zaak",
  "content": {
    "source": { "register": "dossiq", "schema": "case", "id": "@object.case" },
    "fields": [
      { "as": "title", "path": "title", "route": { "name": "CaseDetail", "params": { "id": "@source.id" } } },
      { "as": "line", "parts": ["identifier", "caseTypeTitle", "requesterName"] },
      { "as": "line", "parts": [{ "path": "assigneeName", "label": "Behandelaar" }, { "path": "deadline", "label": "termijn van de zaak", "format": "date" }] },
      { "as": "pill", "path": "status", "map": { "open": "In behandeling" }, "variantMap": { "open": "purple" } },
      { "path": "deadline", "label": "Termijn", "format": "date" }
    ],
    "link": { "label": "Naar de zaak", "route": { "name": "CaseDetail", "params": { "id": "@source.id" } } },
    "emptyText": "Geen zaak gekoppeld"
  }
}
```

### `fields[]`

| Key | Meaning |
|-----|---------|
| `path` | Dot-path into the object (`domains`, `@self.updated`). |
| `label` | Row label, translated. An entry with a label and no `as` is a row. |
| `as` | `row`, `title`, `line` or `pill`. Without `as` and without `label` an entry is a `line`. |
| `format` | `text` (default), `date` (board short date: "5 okt", the year only outside this year), `date-long` (always with the year), `list` (an array joined by ", ") or `user` (a Nextcloud user id shown as the user's display name, read once per id and shared with the header meta tokens; the entry stays empty until the name is known). |
| `itemPath` | With `list`: the path read off each array item (`hostname` of `domains[]`). |
| `resolve` | `{ register, schema, labelField? }`. The value is a reference (an id, or a list of ids): the row shows the label of the referenced object (`labelField`, else `title`, then `name`) instead of the id. Works on a row, a `title`, and on a part of a `line`. The ids are read through the object store, one batched request per register and schema, and the labels are shared by every facts widget on the page. The entry stays empty until its label is known, and when none can be read; it never shows the id. With an array of objects, `itemPath` names the id (default `id`, then `uuid`). |
| `map` | Raw value to label, translated (`{ "published": "Published" }`). Booleans read `"true"` / `"false"`, else Yes / No. |
| `parts` | On a `line`: paths (or `{ path, label?, format? }`) joined by `separator` (default " · "). Empty parts are dropped; a labelled part reads "label value". |
| `route` | On a `title`: `{ name, params?, query? }` so the title links. Takes `@source.<field>` tokens. |
| `variant` / `variantMap` / `colorMap` | On a `pill`: the CnStatusBadge variant, or value to variant (`colorMap` is the same as `variantMap`). An unknown variant falls back to `default`. |
| `resolve` on a `pill` | The pill shows the label of the referenced object; `map` is applied to that label. The tone is looked up in `variantMap` / `colorMap` by the value of `resolve.toneField` on the referenced object when that is set (a status shown by its `name` and coloured by its `state`), then by the resolved label, then by the stored value. |
| `key` | Optional stable key for the entry's `data-testid` (`cn-fact-<key>`). |

Consecutive rows form one two-column list (`max-content 1fr`, gap 8px 16px, label muted), as the boards draw it.

### Relation pages: contact details, identity and a lead

The person and organisation boards (screens-relation-pages) draw their side cards with these keys. An entry that uses none of them renders as before.

| Key | On | Meaning |
|-----|----|---------|
| `format: "email"` / `"phone"` / `"url"` | a row | The value is a `mailto:` / `tel:` / web link (a url opens in a new tab). |
| `format: "masked"` | a row | Only the last four characters show ("*****7609"). |
| `reveal` | a masked row | `true` adds a Show button. Showing emits `reveal` with `{ path }` and announces `{ path, objectId, register, schema }` on the event bus channel `cn:facts:reveal` (`FACTS_REVEAL_CHANNEL`), so the app can log who saw it. |
| `copy` | a row | `true` adds a copy button that writes the raw value to the clipboard. |
| `icon` | a row | An icon in place of the label (the label stays for a screen reader). A row with only an `icon` is a row too. |
| `as: "lead"` | an entry | An icon tile (`icon`) or the initials of the value at `initialsPath`, beside a bold `title` and a muted `subtitle`. `title` and `subtitle` take a path, a part, or an array of parts joined as a line. `tone` (`success`, `info`) tints the tile. A lead with an empty title is left out. |
| `as: "text"` | an entry | A line in the normal ink (address lines), with `parts` as a `line` takes them. |
| `{ "text": "..." }` | a part | A constant part ("Handelsregister"). A `line` or `text` entry without `path` or `parts` shows its own `text` ("Het tonen van het BSN wordt gelogd."). |
| `action` | `content` | An action object (the header action shape) drawn as a tinted button under the facts. `@objectId` / `@object.<field>` resolve before it is dispatched. |
| `headerAction` | `content` | The same, drawn as a small button in the card header ("+ Toevoegen"). The widget reports it through the `header` event; the detail page puts it in the card header, also on a side card. |

```json
{
  "type": "facts",
  "title": "Identiteit",
  "content": {
    "fields": [
      { "as": "lead", "icon": "ShieldAccountOutline", "tone": "success", "title": [{ "text": "Ingelogd met DigiD" }], "subtitle": [{ "path": "lastLoginAt", "label": "bij het contactmoment van", "format": "date" }] },
      { "label": "BSN", "path": "bsn", "format": "masked", "reveal": true },
      { "label": "Geheimhouding", "path": "confidential", "map": { "true": "Ja", "false": "Nee" } },
      { "as": "line", "text": "Het tonen van het BSN wordt gelogd." }
    ]
  }
}
```

### Other keys

| Key | Meaning |
|-----|---------|
| `source` | `{ register, schema, id }` or `{ url }`. Omitted: the current object. `id` takes the shared tokens (`@object.<field>`, `@objectId`, `@workspace.<key>`, `@me`); `url` takes them inside the string (`/apps/x/api/summary/@objectId`). While a token does not resolve the widget sends no request and shows the empty text. |
| `link` | `{ label, route }` or `{ label, href }` at the foot. Routes and hrefs take `@source.<field>` (`@source.id` reads `id`, else `@self.id`). A link whose token does not resolve is left out. |
| `hideEmpty` | Drop an entry whose value is empty (default `true`). |
| `emptyText` | Shown when no entry has a value. Default "Nothing to show yet". |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The widget configuration above. |
| `objectData` | `object` | `null` | The current detail-page object, passed by the detail page host. Read when `content.source` is not set, and for `@object.<field>` tokens. |
| `objectId` | `string\|number` | `null` | The current object id, for the `@objectId` token. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `reveal` | `{ path }` | A masked value was shown. |
| `header` | `{ link, note, action }` | The card header's parts; `action` is the `headerAction` (`{ label, icon, run }`) or null. |

## Notes

- **Chrome.** `facts` is a content-only type: on a detail page the host wraps it in the titled card with the manifest `title` and `icon`; in a tab panel it renders bare. Under the board look the side column styles that card.
- **Three states.** A failed source read shows one quiet line ("Could not load this information", the error goes to the console); an object with no values shows `emptyText`; loading shows a small spinner.
- **Translation.** Labels, `map` values, the link label and the empty text go through the host app's `cnTranslate`. Values read off the object are shown as they are.
- Renderer only: there is no config form, so the Add-widget picker does not offer it. Declare it in the manifest.

## An entry from the page's own object (`from: "object"`)

A card with a `source` shows another object, such as the client of a ticket. An entry with `from: "object"` reads the
page's own object instead, so one card can show the client's name and the ticket's channel (board PqTicket "Klant"):

```json
{
  "type": "facts",
  "title": "Client",
  "content": {
    "source": { "register": "pipelinq", "schema": "client", "id": "@object.client" },
    "fields": [
      { "as": "lead", "title": "name", "subtitle": ["kind", "address"], "initialsPath": "name" },
      { "path": "channel", "label": "Channel", "from": "object" },
      { "path": "account", "label": "Contact" }
    ],
    "link": { "label": "Contact details and earlier tickets", "route": { "name": "ClientDetail", "params": { "id": "@source.id" } } }
  }
}
```

## Two columns, label above value (`columns: 2`)

`columns: 2` lays the rows out in two columns with the label above the value and a hairline under each fact (one
column on a phone), as the board DqContact "Contact" card draws a person. Paths read nested fields, a row with `parts`
joins them like a line, and a part can be a group of parts with its own separator, so an address reads on one row:

```json
{
  "type": "facts",
  "title": "Contact",
  "content": {
    "columns": 2,
    "fields": [
      { "path": "displayName", "label": "Name" },
      { "path": "name.givenNames", "label": "Given names" },
      { "path": "name.surname", "label": "Surname" },
      { "path": "birth.date", "label": "Date of birth", "format": "date-long" },
      { "key": "address", "label": "Residential address", "separator": ", ", "parts": [
        { "parts": ["residence.street", "residence.houseNumber"], "separator": " " },
        { "parts": ["residence.postcode", "residence.city"], "separator": " " }
      ] },
      { "path": "description", "label": "Description" }
    ]
  }
}
```
