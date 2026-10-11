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
| `format` | `text` (default), `date` (board short date: "5 okt", the year only outside this year), `date-long` (always with the year) or `list` (an array joined by ", "). |
| `itemPath` | With `list`: the path read off each array item (`hostname` of `domains[]`). |
| `map` | Raw value to label, translated (`{ "published": "Published" }`). Booleans read `"true"` / `"false"`, else Yes / No. |
| `parts` | On a `line`: paths (or `{ path, label?, format? }`) joined by `separator` (default " · "). Empty parts are dropped; a labelled part reads "label value". |
| `route` | On a `title`: `{ name, params?, query? }` so the title links. Takes `@source.<field>` tokens. |
| `variant` / `variantMap` | On a `pill`: the CnStatusBadge variant, or raw value to variant. An unknown variant falls back to `default`. |
| `key` | Optional stable key for the entry's `data-testid` (`cn-fact-<key>`). |

Consecutive rows form one two-column list (`max-content 1fr`, gap 8px 16px, label muted), as the boards draw it.

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

## Notes

- **Chrome.** `facts` is a content-only type: on a detail page the host wraps it in the titled card with the manifest `title` and `icon`; in a tab panel it renders bare. Under the board look the side column styles that card.
- **Three states.** A failed source read shows one quiet line ("Could not load this information", the error goes to the console); an object with no values shows `emptyText`; loading shows a small spinner.
- **Translation.** Labels, `map` values, the link label and the empty text go through the host app's `cnTranslate`. Values read off the object are shown as they are.
- Renderer only: there is no config form, so the Add-widget picker does not offer it. Declare it in the manifest.
