# CnSwitchRowsWidget

A card of switches, each with a label and a hint, bound to boolean fields of the CURRENT object. A toggle saves at once. Registered under the `switch-rows` widget type.

A portal's "Verkeer meten", "Berichtenbox van MijnOverheid" and "Als app installeren", and a settings card of "Verplichte velden" are this shape.

## Content shape

```json
{
  "id": "portal-install",
  "type": "switch-rows",
  "title": "Als app installeren",
  "content": {
    "rows": [
      { "key": "installEnabled", "label": "Bezoekers kunnen de portal installeren op hun telefoon", "hint": "De app bewaart alleen de schil van de site." }
    ]
  }
}
```

| Key | Meaning |
|-----|---------|
| `rows[].key` | A top-level boolean field of the object. |
| `rows[].label`, `rows[].hint` | Texts, translated through `cnTranslate`. |
| `rows[].invert` | The switch is on when the field is false (a stored `installDisabled` read as "on"). |
| `readOnly` | Disables every switch. |

## Behaviour

- A toggle sends ONE `PATCH` of that field. The switch is disabled while the request runs.
- A refused PATCH puts the switch back to its last saved state and shows the server's own words.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The configuration above. |
| `objectData` | `object` | `null` | The current detail-page object; switches are read from it. |
| `objectId` | `string\|number` | `''` | The object id, for the PATCH url. |
| `register` | `string\|object` | `''` | Register slug of the surface, for the PATCH url. |
| `schema` | `string\|object` | `''` | Schema slug of the surface, for the PATCH url. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `saved` | `{ field, value }` | After a successful PATCH of one switch. |

## Notes

- Content-only on the detail page: it gets the titled card; inside a `sections` widget it renders bare.
- Renderer only: no config form.
