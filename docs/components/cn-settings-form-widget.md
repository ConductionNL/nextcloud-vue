# CnSettingsFormWidget

Fields of the CURRENT object as a one- or two-column grid of framed inputs with light labels and hints, saved by one PATCH of the fields that changed. Registered under the `settings-form` widget type.

A portal's "Gegevens van de portal" card, a client portal's name, domain and colour, and a "Standaardinstellingen" card (a select, switches, numbers with a hint) are all this shape. The manifest says which fields, how each reads, and what is required; the widget keeps the last saved values and sends only what differs from them.

## Content shape

```json
{
  "id": "portal-details",
  "type": "settings-form",
  "title": "Gegevens van de portal",
  "content": {
    "columns": 2,
    "saveLabel": "Opslaan",
    "savedText": "De portal is opgeslagen.",
    "fields": [
      { "key": "title", "label": "Naam", "required": true },
      { "key": "slug", "label": "Adres in portal", "hint": "Pagina's en menu's horen via dit adres bij de portal.", "pattern": "^[a-z0-9-]+$", "patternMessage": "Alleen kleine letters, cijfers en streepjes." },
      { "key": "kind", "label": "Soort", "type": "select", "options": [{ "value": "site", "label": "Website op portaliq" }, { "value": "redirect", "label": "Verwijst naar een andere site" }] },
      { "key": "pageLimit", "label": "Pagina's per lijst", "type": "number", "min": 1, "max": 100 }
    ]
  }
}
```

| Key | Meaning |
|-----|---------|
| `columns` | 1 or 2 (default 2). Under 640px it is always one column. |
| `saveLabel`, `savedText` | Button text (default "Save") and the note after a save (default "Saved."). |
| `readOnly` | Disables every control and hides the save button. |
| `fields[].key` | A top-level field of the object. The PATCH is per top-level field, so a dotted path is not supported. |
| `fields[].type` | `text` (default), `textarea`, `select`, `switch`, `number`, `file`. |
| `fields[].label`, `hint`, `placeholder` | Texts, translated through `cnTranslate`. |
| `fields[].options` | For `select`: `[{ value, label }]` or plain strings. |
| `fields[].required`, `pattern`, `patternMessage`, `min`, `max` | Checked before any request. |
| `fields[].picker` | For `file`: `{ title?, mimeTypes?, startAt?, valueTemplate? }`. The button opens Nextcloud's file picker (filtered by `mimeTypes`, started at `startAt`); the chosen file is written through `valueTemplate` with `{path}`, `{fileid}` and `{name}` (default `{path}`). |
| `fields[].chooseLabel`, `clearLabel`, `placeholder` | For `file`: the choose button text (default "Choose a file"), the remove button text (default "Remove") and the text when no file is set. |
| `fields[].wide`, `rows`, `readOnly` | `wide` spans both columns (always for a textarea); `rows` is the textarea height. |

## Behaviour

- One `PATCH` of the changed fields. Nothing changed: no request, the saved note shows.
- The comparison is against the last SAVED values, not against the object the page loaded with: editing a field back to the loaded value after a save still counts as a change.
- Numbers are sent as numbers, an emptied value as `null`.
- A refused PATCH shows the server's own words and keeps what was typed.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The configuration above. |
| `objectData` | `object` | `null` | The current detail-page object; values are read from it. |
| `objectId` | `string\|number` | `''` | The object id, for the PATCH url. |
| `register` | `string\|object` | `''` | Register slug of the surface, for the PATCH url. |
| `schema` | `string\|object` | `''` | Schema slug of the surface, for the PATCH url. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `saved` | `{ patch }` | After a successful save, with the fields that were written (empty when nothing changed). |

## Notes

- Content-only on the detail page: it gets the titled card; inside a `sections` widget it renders bare.
- A save without a register, schema or id says "This form cannot be saved here." and writes nothing.
- Renderer only: no config form.
