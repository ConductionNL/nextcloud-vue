# CnChoicePickerWidget

Choice cards read from a source, each with a radio, colour swatches, a title and a state pill, bound to one field of the CURRENT object, with a warning band and a confirm button for a risky choice. Registered under the `choice-picker` widget type.

A portal's "Huisstijl" (theme cards with swatches, "Leesbaar" / "Slecht leesbaar" / "Niet gecontroleerd", and "Opslaan" / "Toch gebruiken") is this shape.

## Content shape

```json
{
  "id": "portal-theme",
  "type": "choice-picker",
  "title": "Huisstijl",
  "content": {
    "field": "theme",
    "legend": "Huisstijl",
    "saveLabel": "Opslaan",
    "confirmLabel": "Toch gebruiken",
    "warningIntro": "Deze huisstijl is slecht leesbaar:",
    "hint": "De thema's komen uit de themacatalogus.",
    "save": { "method": "PUT", "url": "/apps/portaliq/api/portals/@object.slug/theme", "payload": { "theme": "@value", "acceptFindings": "@confirmed" } },
    "source": {
      "url": "/apps/portaliq/api/portals/@object.slug/theme",
      "path": "sets",
      "key": "id",
      "label": "name",
      "swatches": "colors",
      "refusal": "refusal",
      "state": { "path": "verdict.passes", "map": { "true": "Leesbaar", "false": "Slecht leesbaar" }, "variantMap": { "true": "success", "false": "warning" }, "empty": "Niet gecontroleerd" },
      "warning": { "list": "findings", "item": "{token} op de {surface} is {ratio}:1, nodig {threshold}:1." }
    }
  }
}
```

| Key | Meaning |
|-----|---------|
| `field` | The top-level field of the object holding the chosen key. |
| `items` | Static cards, in the same item shape as the source. |
| `source.url`, `path`, `key`, `label` | Where the cards come from (url takes `@objectId` and `@object.<field>`), the path to the list, and the item paths of the key and the title. |
| `source.swatches` | Path to an array of CSS colours, drawn as 18px squares. |
| `source.state` | The pill: `path` to the value, `map` (value to text), `variantMap` (value to a badge variant: `success`, `warning`, `error`, ...), `empty` (text when the value is missing, so an item nothing measured never reads as a pass), `emptyVariant`. |
| `source.refusal` | Path to a string: the card is listed with this reason and cannot be chosen. |
| `source.warning` | `{ list, item? }`: `list` is a path to an array; `item` is a template with `{path}` placeholders for object entries (strings are used as they are). |
| `save` | `{ method?, url, payload? }`: a custom request with the tokens `@value`, `@confirmed`, `@objectId`, `@object.<field>`. Without it the widget PATCHes `field` on the object. |
| `legend`, `warningIntro`, `saveLabel`, `confirmLabel`, `savedText`, `emptyText`, `hint`, `readOnly` | Texts, translated through `cnTranslate`; `readOnly` hides the buttons. |

## Behaviour

- Choosing a card writes nothing; Save is disabled for the stored choice.
- A selected card with warning lines shows them in a warning band and adds the confirm button. Save and the confirm button send the same request; `@confirmed` is false for Save and true for the confirm button, so the server decides whether an unconfirmed risky choice is refused.
- A refused request shows the server's own words.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The configuration above. |
| `objectData` | `object` | `null` | The current detail-page object; the choice is read from `objectData[field]`. |
| `objectId` | `string\|number` | `''` | The object id, for the PATCH url and the `@objectId` token. |
| `register` | `string\|object` | `''` | Register slug of the surface, for the PATCH url. |
| `schema` | `string\|object` | `''` | Schema slug of the surface, for the PATCH url. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `saved` | `{ field, value, confirmed }` | After a successful save. |

## Notes

- Content-only on the detail page: it gets the titled card; inside a `sections` widget it renders bare.
- A choice that saves on selection and has no source: `radio-cards`.
- Renderer only: no config form.
