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
| `newItem` | Object | `null` | The values a new row starts with; the row schema's defaults fill the rest. |
| `itemLabel` | String | `''` | What one row is called: "Checklist item" names the rows "Checklist item 1", "Checklist item 2" for the row actions and the edit dialog. Defaults to "Row". |
| `emptyText` | String | `''` | Shown while there are no rows. Defaults to "No rows yet.". |
| `inline` | Boolean | `false` | Edit the cells in the row, without a row dialog, for two to four short columns. An `enum` column is a select (labels from `x-enum-labels`), a boolean a switch, `integer`/`number` a number field, `format: time` or `date` a time or date field, anything else a text field. Each cell is named after its column and row ("Opens, Hours 2"). Add appends a row with `newItem` and focuses its first cell. |
| `summary` | String | `''` | A line under the table: `{count}` rows, `{sum:<path>}` the sum of a number field, `{@object.<path>}` a field of `parentData`. Shown while there are rows. |
| `rowRules` | Array | `[]` | `{ when, message }`: when the local `visibleWhen` condition `when` holds for a row, the row is wrong. The first broken rule shows under the table as "Hours 2: message". `@row.<field>` names another field of the same row; two clock times (`09:00`) compare as times of the day. |
| `parentData` | Object | `null` | The object the rows belong to, for `{@object.<path>}` in `summary`. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `object[]` | The rows in their new sequence. |

## Keyboard and screen readers

Each row's actions are named after the row ("Actions for Checklist item 2"). After a row is added, focus moves to its actions; after one is removed, to the previous row's actions, or to the add button when none is left.

## In a form

`CnFormDialog` passes these from the field's override: `itemOverrides` (the row form's field overrides), `newItem`, `itemLabel`, `emptyText` and `addLabel`. `pruneWhen` tidies the rows before the form is saved: strings are trimmed, optional keys left empty are omitted, a row whose `blank` key is empty is dropped, and with `invalid: true` so is a row missing a required key. Those rows are not checked when the form validates.

`inline`, `summary` (translated) and `rowRules` (messages translated) pass through as well, and `parentData` is the form's data. A broken row rule blocks the save like a missing required value.

```json
"workingHours": {
  "inline": true,
  "itemLabel": "Working hours",
  "rowRules": [{ "when": { "all": [{ "field": "openTime", "op": "notEmpty" }, { "field": "openTime", "op": "gte", "value": "@row.closeTime" }] }, "message": "Open time must be before close time." }]
},
"multiStep": { "summary": "{sum:durationMinutes} of {@object.durationMinutes} min" }
```

```json
"checklist": { "itemLabel": "Checklist item", "emptyText": "No checklist items yet.", "newItem": { "required": false }, "pruneWhen": { "blank": ["title"] } }
```
