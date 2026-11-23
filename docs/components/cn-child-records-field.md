import GeneratedRef from './_generated/CnChildRecordsField.md'

# CnChildRecordsField

An editable table of the records of another schema that point at this one, inside a form: the lines of an order, the cost items of a request. It is the `child-records` widget of [`CnFormDialog`](./cn-form-dialog.md).

The table offers **Add row**, inline editing of the columns it shows (string and number properties), an **Edit** dialog for the other fields, and **Remove**. On an existing parent it loads the first 50 children (those whose `parentField` names the parent) and says how many there are beyond that; editing hundreds of rows belongs on a list page.

## The relation it reads

`fieldsFromSchema` gives a property the widget when it is an array whose items carry a `$ref` and the property carries `inversedBy` (the child's property that points back):

```json
{ "lines": { "type": "array", "items": { "$ref": "order-line" }, "inversedBy": "order" } }
```

An explicit `widget` on the property wins, so a plain picker stays a picker. When the relation is not declared on the parent, name it: `{ "widget": "child-records", "schema": "order-line", "parentField": "order", "columns": ["product", "qty"] }`. Without `columns`, the first four required properties of the child schema are shown.

## Why children are saved after the parent

`CnFormDialog` keeps the children out of the parent's payload. After the host saves the parent and calls `setResult({ success: true, id })`, the dialog sends every new and changed row in one bulk save to the child schema (with `parentField` set to the parent id) and every removed row in one bulk delete. A single nested save is not relied on because nothing establishes that it updates a changed child or removes a deleted one. A row the server refuses is named in the result with the reason, and the parent stays saved. Each row is checked against the child schema's required properties first; a failing row blocks the submit and says which row and field.

See [`useChildRecords`](../utilities/composables/use-child-records.md) for the helpers.

## Computed columns, totals and adding from a list

Boards PqOfferte, PqLead and PqKassaAfrekenen draw order lines: a line total per row, totals under the table, and rows taken from a catalogue or a scanned code. Three optional keys on the relation draw them.

```json
{
  "widget": "child-records", "schema": "quote-line", "parentField": "quote",
  "columns": ["product", "quantity", "unitPrice", "discount"],
  "computed": [
    { "key": "lineTotal", "label": "Line total", "formula": "quantity * unitPrice * (1 - discount / 100)", "format": "currency", "currency": "EUR", "decimals": 2, "store": true }
  ],
  "totals": [
    { "key": "subtotal", "label": "Subtotal", "sum": "lineTotal", "format": "currency", "currency": "EUR", "decimals": 2 },
    { "key": "tax", "label": "VAT", "sum": "lineTotal * vatRate / 100", "format": "currency", "currency": "EUR", "decimals": 2 },
    { "key": "total", "label": "Total", "formula": "subtotal + tax", "format": "currency", "currency": "EUR", "decimals": 2, "emphasis": true }
  ],
  "addFrom": {
    "schema": "product", "label": "Add a product", "titleField": "name",
    "map": { "product": "@id", "unitPrice": "price", "vatRate": "vatRate" },
    "codeField": "barcode"
  }
}
```

- **`computed`** adds a read-only column per entry, after the plain columns. The formula names row keys and earlier computed keys. It takes `+ - * /` and brackets, through `evalFormula`, so no `eval` runs. An empty value counts as 0. With `store`, the value is written into the row whenever the row changes, so it is saved with the row.
- **`totals`** adds a row under the table per entry. `sum` adds a formula over every row; a column key alone is a formula too. `formula` works over the totals above it. `emphasis` sets the row in bold with a line above it. The field emits `totals` with the value per key, so a host can set the parent's value from it.
- **`addFrom`** puts a search over another schema's records next to **Add row**. A picked record becomes a row through `map`, which names per row key the source key to copy, or `@id` for the source's id. With `codeField`, a code field finds the one record with that code. A barcode scanner types the code and presses Enter. No match, or more than one, shows an error and adds nothing. `freeRows: false` hides **Add row**.

Formats take the keys of `formatMetricValue` (`utils/formatMetric`): `format` (`currency`, `decimal`, `number`, `percent`), `currency` and `decimals`. Without a format a value shows two decimals. Prices and tax rates are your data: the field holds no tax rules.

## Props

| Prop | Default | Description |
|------|---------|-------------|
| `modelValue` | `[]` | The rows (v-model). |
| `config` | required | `{ schema, parentField, columns?, computed?, totals?, addFrom? }`. |
| `register` | `''` | Register slug of the child schema. |
| `parentId` | `''` | Id of the parent being edited; empty when creating. |
| `inputLabel` (`input-label`) | `''` | Visible label. |
| `disabled` | `false` | Hide the editing controls. |
| `error` | `''` | Validation message under the table. |
| `apiBase` (`api-base`) | `/apps/openregister/api` | OpenRegister API base. |
| `maxColumns` (`max-columns`) | `4` | Most columns shown when none are configured. |

## Events

| Event | Payload | When |
|-------|---------|------|
| `update:modelValue` | rows | A row was added, changed or removed. |
| `loaded` | rows | The children of an existing parent were loaded. |
| `validity` | problems | The row problems changed. |
| `totals` | value per key | The totals changed. |

<GeneratedRef />
