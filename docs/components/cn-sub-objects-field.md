# CnSubObjectsField

Edits an array of objects embedded in one object as a table. `CnFormDialog` renders it for a property of `type: array` whose `items` is an object schema, when the property declares `x-widget: sub-objects` or the form passes `fieldOverrides.<key>.widget: 'sub-objects'`. Without either, the property keeps its current widget.

Columns come from `items.properties`, up to `maxColumns`; the other properties stay editable in the row dialog. Each row has Edit (opens a nested `CnFormDialog` over `items`, so every widget works inside a row), Duplicate, Move up, Move down and Remove. Move up and Move down are buttons, so the order can be changed from the keyboard. When `items.properties` declares `order`, it is rewritten to 1..n after every change. In `CnFormDialog`, Save is blocked when a row misses a value listed in `items.required`, and the message names the row ("Row 2: key is required.").

For rows that are their own records, use an object-list widget instead.

## Usage

```vue
<CnSubObjectsField v-model="statuses" input-label="Statuses" :items="itemsSchema" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | Array | `[]` | The array of row objects (v-model). |
| `items` | Object | `{ properties: {} }` | JSON Schema of one row (`type: object`, `properties`, optional `required`). |
| `inputLabel` | String | `''` | Visible label of the table. |
| `maxColumns` | Number | `6` | Most columns shown in the table; further properties are edited in the row dialog. |
| `disabled` | Boolean | `false` | Hide the editing controls. |
| `error` | String | `''` | Validation message shown under the table. |
| `addLabel` | String | `'Add row'` | Label of the add button. |
| `fieldOverrides` | Object | `{}` | Field overrides forwarded to the row dialog. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `object[]` | The rows in their new sequence. |
