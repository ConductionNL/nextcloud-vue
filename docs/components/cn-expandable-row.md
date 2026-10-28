# CnExpandableRow

A list row that opens to a sub-table. [CnIndexPage](./cn-index-page.md) draws one per object when the manifest sets `config.expandableRows`. Closed, the row shows its title, a badge while a condition holds, a description, a list field as chips and meta lines. Open, it shows a table of the object's entries with an optional note and footer action.

```json
{
  "expandableRows": {
    "title": "name",
    "badge": { "when": { "status": "active" }, "label": "Active" },
    "chips": { "field": "stages", "each": "name", "tones": [{ "when": { "won": true }, "variant": "success" }] },
    "table": {
      "field": "stages",
      "columns": [{ "key": "name", "label": "Stage" }, { "key": "probability", "label": "Chance", "as": "bar" }]
    },
    "buttons": [{ "action": "edit", "label": "Edit", "icon": "Pencil" }],
    "open": "first"
  }
}
```

A column's `as` is `text` (the default), `order`, `bar`, `check`, `yesNo` or `pill`. A header button or the footer action names a row action by its id, and it runs as it would from the row's menu. `open` is `first` or `all`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `object` | `object` | (required) | The row's object. |
| `layout` | `object` | (required) | `{ title, badge?, description?, chips?, meta?, table?, buttons? }`. A button is `{ action, label?, icon? }`; `icon` is a CnIcon name drawn before the label. |
| `open` | `boolean` | `false` | Whether the row starts open. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `action` | `{ id, row }` | A header button or the footer action. |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `actions` | `{ row }` | Extra controls after the header buttons. |
