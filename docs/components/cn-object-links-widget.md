# CnObjectLinksWidget

A record's links to other records, each kept as an object of a link schema. Registered under the `object-links` widget type.

Board PqKlant "Relaties" reads "Secretaris van Buurtvereniging Oost" and "Partner van J. de Vries": a link's type in words, then the other record's name as a link to its page, with one "Toevoegen" in the title row. The link objects name this record (`from`) and the other one (`to`); the other one can be a record of more than one schema (a contact person or a client), so a link also says which kind it points at (`toType`).

## Content shape

```json
{
  "id": "client-relationships",
  "type": "object-links",
  "title": "Relationships",
  "content": {
    "register": "pipelinq",
    "schema": "relationship",
    "from": "fromContact",
    "to": "toContact",
    "fromType": "fromType",
    "toType": "toType",
    "selfType": "client",
    "typeField": "type",
    "inverseField": "inverseType",
    "groupField": "category",
    "pair": true,
    "types": [
      { "value": "partner", "label": "Partner of", "inverse": "partner", "group": "Family" },
      { "value": "werkgever", "label": "Employer of", "inverse": "werknemer", "group": "Professional" }
    ],
    "targets": [
      { "type": "contact", "register": "pipelinq", "schema": "contact", "titleField": "name", "label": "contact", "route": "ContactDetail" },
      { "type": "client", "register": "pipelinq", "schema": "client", "titleField": "name", "label": "client", "route": "ClientDetail" }
    ],
    "fields": [
      { "key": "notes", "label": "Notes", "type": "textarea" },
      { "key": "startDate", "label": "Start date", "type": "date" },
      { "key": "endDate", "label": "End date", "type": "date" }
    ],
    "defaults": { "provenance": "declared" },
    "add": { "label": "Add", "ariaLabel": "Add relationship", "placement": "title" },
    "remove": { "label": "Remove" },
    "emptyText": "No relationships yet."
  }
}
```

| Key | Meaning |
|-----|---------|
| `register`, `schema` | Where the link objects live (required). |
| `from`, `to` | The link fields that hold this record's id and the other record's id (required). The list reads the links whose `from` is this record. |
| `fromType`, `toType`, `selfType` | The fields that name each side's kind, and this record's kind. A row reads the name from the target its `toType` names, else the first target. |
| `typeField`, `inverseField`, `groupField` | The fields a new link's type, inverse type and group are written to. |
| `types[]` | `{ value, label, inverse?, group? }`: the choices in the dialog ("Partner of (Family)") and how a row words its type. A stored type without an entry shows as stored. |
| `targets[]` | `{ type, register, schema, titleField?, label?, route? }`: the kinds of record a link can point at. The dialog searches each (`_search`, ten each, this record left out) and shows `label` under a result; a row links to `route` with `params.id`. `titleField` defaults to `name`. |
| `pair` | Write the inverse link from the other record on add, and delete it on remove. |
| `fields[]` | `{ key, label, type?: "text" \| "textarea" \| "date" }`: extra values the dialog asks; empty ones are not written. |
| `defaults` | Values written on every new link. |
| `filter`, `limit` | Extra list filters; how many links to read (default 100). |
| `add` | `{ label?, ariaLabel?, placement?, dialogTitle? }`. `"title"` reports the Add on the `header` event for the card's title row; otherwise it is a button under the list. |
| `remove` | `{ label? }`: Remove in each row's "..." menu. Omitted: no remove. |
| `readOnly` | No add and no remove. |
| `emptyText`, `duplicateText`, `targetLabel`, `typeLabel` | Texts, translated through the host app. |

A link to the same record with the same type is refused before anything is written. Every write goes to OpenRegister, which checks the user's rights before it writes; a refusal shows in the server's words. Without a record id or a link schema the widget sends nothing.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The configuration above. |
| `objectData` | `object` | `null` | The current detail-page record. |
| `objectId` | `string\|number` | `''` | The record id. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `header` | `{ actions }` | The title-row Add (`add.placement: "title"`), or no actions. |

## Notes

- Content-only on the detail page: the host draws the titled card.
- Renderer only: no config form.
