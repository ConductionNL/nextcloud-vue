# CnConflictResolveCard

One card per open conflict record: for each field that differs, the value written on this device and the value stored elsewhere, with one button per version. Registered under the `conflict-resolve` widget type.

The sync frame of an offline inspection ("Conflict: welke tekst houdt u?", with "Deze houden" and "Die van kantoor") is this shape.

## Content shape

```json
{
  "id": "inspection-conflict",
  "type": "conflict-resolve",
  "title": "Conflict",
  "content": {
    "source": { "register": "dossiq", "schema": "conflictRecord", "filter": { "resolution": { "isnull": true } }, "limit": 3 },
    "title": "Conflict: which text do you keep?",
    "localText": "On this device: \"{value}\"",
    "officeText": "At the office: \"{value}\"",
    "keepLocalLabel": "Keep this one",
    "keepOfficeLabel": "The office one",
    "resolve": { "url": "/apps/dossiq/api/conflict-records/{id}/resolve", "capability": "dossiq.conflictResolution" }
  }
}
```

| Key | Meaning |
|-----|---------|
| `source` | `{ register, schema, filter?, sort?, limit? }` of the conflict records. Filter operators go out as `key[op]` (`{ "resolution": { "isnull": true } }`); `limit` defaults to 5. A record that already has a `resolution` is never drawn. |
| `localPath`, `officePath` | Paths to the two snapshots on the record; default `clientVersion` and `serverVersion`. |
| `fields` | Field paths to compare (dot paths, `responses.0.comment`). Without it the record's own list at `fieldsPath` (default `conflictFields`) is used, and without that every top-level key of the snapshots except `@self`, `id`, `uuid`, `created`, `updated`, `version` and keys starting with `_`. A field with the same value on both sides is left out, and a record with no differing field draws no card. |
| `fieldLabels` | `{ path: label }`, shown above a field when more than one field differs. |
| `title`, `localText`, `officeText` | Texts; `{value}` in the two line templates is the value (an object reads as JSON). |
| `keepLocalLabel`, `keepOfficeLabel` | The button texts. |
| `unavailableText`, `errorText` | Why the buttons are off, and the line shown when the records cannot be read. |
| `resolve.url` | Template filled from the record (`{id}`), under the Nextcloud root. |
| `resolve.method` | `POST` (default), `PUT` or `PATCH`. |
| `resolve.resolutions` | `{ local, office }`: the value sent for each button; default `client_wins` and `server_wins`. |
| `resolve.capability` | A dot path into the Nextcloud capabilities. The buttons stay disabled until it reads true. |

All texts go through `cnTranslate`.

## Behaviour

- Choosing posts `{ "resolution": "<value>" }` to the url. The server writes the chosen value and marks the record resolved; the card then leaves and `resolved` fires.
- A refused request keeps the card and shows the server's own words under it.
- Without `resolve.url`, or while the named capability is missing, both buttons are disabled and described by `unavailableText`, so the card can ship before its endpoint does.
- With no open conflict the widget draws nothing.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The configuration above. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `resolved` | `{ id, resolution }` | A conflict was settled. |
