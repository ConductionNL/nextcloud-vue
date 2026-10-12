# CnChipsFieldWidget

A list of short strings in one array field of the CURRENT object, drawn as chips and added and removed in place. Registered under the `chips-field` widget type.

A portal's "Zonder goedkeuring voor deze e-maildomeinen", "Mag ingesloten worden op" and "Talen" are this shape. Every add and remove is ONE `PATCH` of that field with the full new list.

## Content shape

```json
{
  "id": "portal-domains-auto",
  "type": "chips-field",
  "title": "Zonder goedkeuring",
  "content": {
    "field": "autoApproveDomains",
    "label": "Zonder goedkeuring voor deze e-maildomeinen",
    "addLabel": "Domein",
    "confirmLabel": "Toevoegen",
    "lowercase": true,
    "pattern": "^[a-z0-9-]+(\\.[a-z0-9-]+)+$",
    "patternMessage": "Dit is geen domeinnaam."
  }
}
```

| Key | Meaning |
|-----|---------|
| `field` | The top-level array-of-strings field (required). |
| `label`, `hint`, `placeholder` | Texts, translated through `cnTranslate`. |
| `addLabel`, `confirmLabel`, `removeLabel` | The "+ add" chip text, the add button text (default "Add") and the remove button's name (default "Remove"). |
| `pattern`, `patternMessage` | Checked on every typed entry before any request. |
| `lowercase` | Stores entries in lower case. |
| `options` | `[{ value, label }]`: the add chip offers the options not yet stored instead of free text; chips show the label. Use it for languages. |
| `readOnly` | No add chip, no remove buttons. |

## Behaviour

- An entry is trimmed, then refused with a message before any request when it is empty, fails the pattern or is already in the list.
- A refused PATCH shows the server's own words and keeps the chips as stored.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The configuration above. |
| `objectData` | `object` | `null` | The current detail-page object; the list is read from `objectData[field]`. |
| `objectId` | `string\|number` | `''` | The object id, for the PATCH url. |
| `register` | `string\|object` | `''` | Register slug of the surface, for the PATCH url. |
| `schema` | `string\|object` | `''` | Schema slug of the surface, for the PATCH url. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `saved` | `{ field, value }` | After a successful PATCH, with the list as the server returned it. |

## Notes

- Content-only on the detail page: it gets the titled card; inside a `sections` widget it renders bare.
- For a list of OBJECTS drawn as rows, use `field-list`.
- Renderer only: no config form.
