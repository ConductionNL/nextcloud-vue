# CnFieldListWidget

A list stored INSIDE one field of the current object, shown as rows and edited in place. Registered under the `field-list` widget type.

A portal keeps its domains in `portal.domains[]` and its administrators in `portal.editors[]`; neither is a separate object, so an object list (which queries a schema) cannot show them, and before this widget each was an app component (portaliq `PortalDomains`, `PortalEditors`). The manifest now says which field, how a row reads, what the add form asks, and what a row can do.

Every change is ONE `PATCH` of that one field on the object, after re-reading the stored value, so an entry someone else added a moment ago is not overwritten with a stale copy. The server decides who may write: a refused PATCH shows the server's own words and the list stays as stored.

## Content shape

```json
{
  "id": "portal-domains",
  "type": "field-list",
  "title": "Domeinen",
  "content": {
    "field": "domains",
    "key": "hostname",
    "row": {
      "title": "hostname",
      "pill": { "path": "verified", "map": { "true": "Geverifieerd", "false": "Wacht op controle" }, "variantMap": { "true": "success", "false": "warning" } },
      "aside": { "path": "certificateValidUntil", "format": "date-long", "prefix": "Certificaat tot" },
      "detail": { "template": "Zet dit TXT-record: {name} = {value}", "when": { "verified": false } }
    },
    "rowActions": [
      { "id": "verify", "label": "Opnieuw controleren", "when": { "verified": false },
        "request": { "method": "POST", "url": "/apps/portaliq/api/cms/domains/verify", "payload": { "portal": "@object.slug", "hostname": "@row.hostname" } } }
    ],
    "rowSource": { "url": "/apps/portaliq/api/cms/domains?portal=@object.slug", "path": "results", "key": "hostname" },
    "add": {
      "label": "Domein toevoegen",
      "unique": "hostname",
      "defaults": { "verified": false },
      "fields": [ { "key": "hostname", "label": "Domein", "required": true, "pattern": "^[a-z0-9.-]+\\.[a-z]{2,}$", "patternMessage": "Dit is geen domeinnaam." } ]
    },
    "remove": { "label": "Verwijderen" },
    "hint": "Een domein werkt pas als het gecontroleerd is.",
    "emptyText": "Nog geen domein."
  }
}
```

| Key | Meaning |
|-----|---------|
| `field` | The object field that holds the array (required). |
| `key` | The item field that identifies an entry (rows, remove, live state). Strings in the array are their own key. |
| `row.title` / `row.titleFallback` | Paths of the bold line. |
| `row.avatar` | Initials of the title in a round badge. |
| `row.meta` | Paths, or `{ path, map?, format? }`, joined by " · " under the title. |
| `row.pill` | `{ path, map?, variantMap? }`: a CnStatusBadge. |
| `row.aside` | `{ path, format?, prefix?, fallback? }`: muted text at the row's end. `format` is `date` or `date-long`. `fallback` is an optional label (translated through `cnTranslate`) shown when the row has no value; without it the aside is left out. The prefix is not added to a fallback. |
| `row.detail` | `{ template, when? }`: a muted line under the row; `{path}` placeholders, left out when one is empty. |
| `rowActions[]` | `{ id, label, when?, request: { method?, url, payload? } }`: a button on matching rows. Tokens: `@objectId`, `@object.<field>`, `@row.<field>` (a whole-string token keeps its type; inside a url it is encoded). After the request the live state is read again; a `message` in the answer shows as an info note. |
| `rowSource` | `{ url, path?, key }`: live per-row state merged over each entry by key, never written back. |
| `add` | `{ label?, fields[], unique?, defaults? }`. A field is `{ key, label, type?: "text" \| "select", options?, required?, pattern?, patternMessage?, default? }`. `unique` refuses an entry whose key is already stored. `defaults` are written with every new entry. |
| `remove` | `{ label? }`: a remove button per row. Omitted: no remove. |
| `readOnly` | No add form, no remove, no request row actions (dialog row actions stay). |
| `hint`, `emptyText` | Muted texts. |
| `row.href` | Path of a link for the row title. Only http(s) and root-relative links are drawn; an absolute one opens in a new tab. A row with no safe link shows its title as text. |
| `row.href` as `{ path, scheme }` | `scheme` `mailto` or `tel`: the title links to `mailto:<value>` or `tel:<digits>`. |
| `edit` | `true` or `{ label?, saveLabel? }`: an Edit button per row (named "Edit: <title>") opens the add form prefilled; saving replaces that entry in the same one PATCH. Not in `readOnly`. |
| `add.fields[].type: "checkbox"` | A switch; its value is `true` or `false`. |
| `add.exclusive` | Flags (`["primary"]`) only one entry may hold: an entry added or edited with the flag `true` clears it on every other entry. |
| `lead` | A bold line above the rows, translated, with `{path}` placeholders filled from the object (`"Question about the dossier \"{subjectReference.title}\""`). |
| `afterSave` | `{ url, method?, body?, failureText? }`: called after every save that went through, with `@objectId` / `@object.<field>` tokens (a contacts write-back). When it fails, the save stands and `failureText` shows as a warning. |

`when` is `{ field: value }`, every field equal; `false` also matches an absent value. Labels, map values, templates, hint and empty text go through the host app's `cnTranslate`.

## Table variant

`variant: "table"` with `columns` draws the entries as a table; the stored list, the one-field PATCH, the add form, the row actions and `rowSource` stay the same. Without `variant` the list rows stay as above.

```json
{
  "id": "portal-domains",
  "type": "field-list",
  "title": "Domeinen",
  "content": {
    "field": "domains",
    "key": "hostname",
    "variant": "table",
    "columns": [
      { "header": "Domein", "path": "hostname", "strong": true },
      { "header": "Status", "path": "verified", "pill": true, "map": { "true": "Geverifieerd", "false": "Wacht op verificatie" }, "variantMap": { "true": "success", "false": "warning" } },
      { "header": "Certificaat", "path": "certificateValidUntil", "format": "date-long" }
    ],
    "row": { "title": "hostname", "detail": { "template": "{hostname}: zet het TXT-record {name} bij uw domein.", "when": { "verified": false } } },
    "rowActions": [
      { "id": "verify", "label": "Opnieuw controleren", "placement": "band", "when": { "verified": false }, "request": { "method": "POST", "url": "/apps/portaliq/api/cms/domains/verify", "payload": { "hostname": "@row.hostname" } } }
    ],
    "add": { "label": "Domein toevoegen", "trigger": "button", "fields": [{ "key": "hostname", "label": "Domein", "required": true }] },
    "remove": { "label": "Verwijderen" }
  }
}
```

| Key | Meaning |
|-----|---------|
| `variant` | `"table"` (needs `columns`). |
| `columns[]` | `{ header, path, map?, format?, strong?, pill?, variantMap? }`: a cell reads the entry like a row part (`map`, `format`); `pill` draws a status pill (`variantMap` picks the colour); `strong` makes the cell bold. |
| menu | Each row gets a "..." menu named after the row with its row actions (not those with `placement: "band"`) and remove. |
| `row.detail` | In the table variant: a warning band under the table, one per matching row, with the row actions marked `placement: "band"` as buttons. |
| `rowActions[].placement` | `"band"` puts the action in the warning band instead of the menu; `"inline"` draws it as a button in the row, named by `ariaLabel` (a template filled from the row, such as `"Compare {fileName} with the original"`). |
| `rowActions[].dialog` | `{ id, label, dialog, props }` opens the modal registered under `dialog` in the app registry (`cnOpenModal`) instead of sending a request. `props` values are templates with `@objectId`, `@object.<field>`, `@row.<field>` and `@index`; a `/apps/...` value becomes an absolute url. A dialog action shows in a `readOnly` list too, since it writes nothing, and only on rows where every token in its props fills. |
| `rowActions[].when` | Besides `{ field: value }`, a field may take operators `{ eq?, neq?, set? }`, where an operand `@row.<field>` (or `@<field>`) is another field of the same row: `{ deliveredRef: { set: true, neq: '@originalRef' } }`. |
| `columns[].code` | Draw the cell as code (a hash, an id). |
| `add.trigger` | `"button"`: the add form shows only after a "+ label" button; it closes after a successful add. |
| `add.placement` | `"header"` (button above the rows, right-aligned) or `"footer"` (default). |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The configuration above. |
| `objectData` | `object` | `null` | The current detail-page object; the list is read from `objectData[field]`. |
| `objectId` | `string\|number` | `''` | The object id, for the PATCH and the `@objectId` token. |
| `register` | `string\|object` | `''` | Register slug of the surface, for the PATCH url. |
| `schema` | `string\|object` | `''` | Schema slug of the surface, for the PATCH url. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `saved` | `{ field, value }` | After a successful PATCH, with the list as the server returned it. |

## Notes

- Content-only on the detail page: it gets the titled card; in a tab panel or a `sections` widget it renders bare.
- A save without a register, schema or id says "This list cannot be saved here." and writes nothing.
- Renderer only: no config form.
