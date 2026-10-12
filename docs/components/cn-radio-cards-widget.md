# CnRadioCardsWidget

One choice out of a few cards, each with a title and a description, bound to an enum field of the CURRENT object. Choosing a card saves at once. Registered under the `radio-cards` widget type.

A portal's "Aanmelden" (Niemand, Met goedkeuring, Iedereen) is this shape. The cards are real radio inputs, so the choice works from the keyboard and is shown by a dot and a border, not by colour alone.

## Content shape

```json
{
  "id": "portal-signup",
  "type": "radio-cards",
  "title": "Aanmelden",
  "content": {
    "field": "signup",
    "columns": 2,
    "options": [
      { "value": "nobody", "label": "Niemand", "description": "Alleen accounts die de gemeente uitgeeft of uitnodigt" },
      { "value": "approval", "label": "Met goedkeuring", "description": "Iedereen meldt zich aan, een beheerder keurt goed" },
      { "value": "anyone", "label": "Iedereen", "description": "Direct na de bevestigingsmail" }
    ]
  }
}
```

| Key | Meaning |
|-----|---------|
| `field` | The top-level enum field of the object (required). |
| `options[]` | `{ value, label, description? }`; plain strings also work. Texts are translated through `cnTranslate`. |
| `label` | A legend over the cards. |
| `columns` | 1, 2 or 3 (default 2); one column under 640px. |
| `readOnly` | Disables every input. |

## Behaviour

- Choosing a card sends ONE `PATCH` of the field with the option's value. The inputs are disabled while it runs.
- A refused PATCH puts the choice back to the last saved one and shows the server's own words.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The configuration above. |
| `objectData` | `object` | `null` | The current detail-page object; the choice is read from `objectData[field]`. |
| `objectId` | `string\|number` | `''` | The object id, for the PATCH url. |
| `register` | `string\|object` | `''` | Register slug of the surface, for the PATCH url. |
| `schema` | `string\|object` | `''` | Schema slug of the surface, for the PATCH url. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `saved` | `{ field, value }` | After a successful PATCH of the choice. |

## Notes

- Content-only on the detail page: it gets the titled card; inside a `sections` widget it renders bare.
- Not `CnChoiceCards`: that component holds a v-model value on `CnCard`s for the setup wizard and saves nothing.
- Renderer only: no config form.
