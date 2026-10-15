# CnToggleTableWidget

Rows from a configured list or a source, each with a switch bound to the CURRENT object, and optional extra columns. A toggle saves at once. Registered under the `toggle-table` widget type.

A portal's sign-in methods (Inlogwijze, Route, a switch) and "Zaaktypen die inwoners zien" (a case type per row, switched on or off) are this shape.

## Content shape

```json
{
  "id": "portal-case-types",
  "type": "toggle-table",
  "title": "Zaaktypen die inwoners zien",
  "content": {
    "bind": { "mode": "list", "field": "hiddenCaseTypes", "invert": true },
    "source": { "url": "/apps/portaliq/api/case-types?portal=@object.slug", "path": "results", "key": "id", "label": "name", "hint": "hint" }
  }
}
```

```json
{
  "id": "portal-signin",
  "type": "toggle-table",
  "title": "Inloggen",
  "content": {
    "titleHeader": "Inlogwijze",
    "toggleHeader": "Aan",
    "columns": [{ "header": "Route", "path": "route" }],
    "rows": [{ "key": "digid", "label": "DigiD", "field": "signinDigid", "route": "via integriq, de koppeling van de gemeente" }]
  }
}
```

| Key | Meaning |
|-----|---------|
| `bind.mode` | `flag` (default): each row names a boolean field of the object in `row.field`. `list`: one array field, `bind.field`, holds the keys of the rows that are in it. |
| `save` | `{ url, method?, payload? }`: write through an app endpoint instead of the object. `url` and `payload` are templates with the tokens `{value}` (the changed value), `{field}` (its path), `{changes}` (the changed values as a nested object) and `{object.<path>}` (a field of the current object). `method` is `PUT`, `POST` or `PATCH` (default `PATCH`); `payload` defaults to `{changes}`. A string that is exactly one token keeps the value's type. The stored value is still read from the object by path. |
| `bind.mode: "each"` | Every row IS an object read by `source` (`source.key` the object id). The switch is that object's own boolean `bind.field`, and a toggle PATCHes that object at `bind.register` / `bind.schema` (else the surface's). Needs no current object, so it serves a settings page. |
| `bind.mode: "map"` | A boolean per row key in a config map: read from `bind.url` (at `bind.path`) and written through `save` (`{changes}` is `{ <key>: <value> }`), or one field of the current object, `bind.field`, written by its dot-path. |
| `bind.invert` | List mode: the switch is ON when the key is NOT in the list (a list of hidden items shown as visible switches). Each and map modes: the switch is ON when the stored value is false. |
| `rows[]` | Static rows: `{ key, label, hint?, field?, ...extra }`. Texts go through `cnTranslate`. |
| `source` | `{ url, path?, key, label, hint? }`: rows read from an endpoint after the static rows; the url takes `@objectId` and `@object.<field>` tokens. |
| `columns[]` | Extra columns: `{ header, path, map? }`, read off each row; `map` translates stored values. |
| `titleHeader`, `toggleHeader` | Header texts; the header row shows when there are columns or either header is set. |
| `emptyText`, `readOnly` | Text for no rows; disable every switch. |

A settings card of "Verplichte velden" (shillinq ShInstellingen), one switch per FieldRequirement object:

```json
{
  "type": "toggle-table",
  "props": {
    "content": {
      "bind": { "mode": "each", "field": "active", "register": "shillinq", "schema": "FieldRequirement" },
      "source": { "url": "/apps/openregister/api/objects/shillinq/FieldRequirement?_limit=200", "path": "results", "key": "id", "label": "title" }
    }
  }
}
```

## Behaviour

- A toggle sends ONE write: the row's field with the new boolean (flag), the list field with the key added or removed (list), the row's own object (each), or the one key of the map (map). The switch is disabled while it runs.
- A refused PATCH shows the server's own words and the switch is drawn again from the stored value.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The configuration above. |
| `objectData` | `object` | `null` | The current detail-page object; switches are read from it. |
| `objectId` | `string\|number` | `''` | The object id, for the PATCH url and the `@objectId` token. |
| `register` | `string\|object` | `''` | Register slug of the surface, for the PATCH url. |
| `schema` | `string\|object` | `''` | Schema slug of the surface, for the PATCH url. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `saved` | `{ field, value }` | After a successful PATCH of one switch. |

## Notes

- Content-only on the detail page: it gets the titled card; inside a `sections` widget it renders bare.
- Static switches without columns or a source: `switch-rows`.
- Renderer only: no config form.
