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

## Props

| Prop | Default | Description |
|------|---------|-------------|
| `modelValue` | `[]` | The rows (v-model). |
| `config` | required | `{ schema, parentField, columns? }`. |
| `register` | `''` | Register slug of the child schema. |
| `parentId` | `''` | Id of the parent being edited; empty when creating. |
| `inputLabel` (`input-label`) | `''` | Visible label. |
| `disabled` | `false` | Hide the editing controls. |
| `error` | `''` | Validation message under the table. |
| `apiBase` (`api-base`) | `/apps/openregister/api` | OpenRegister API base. |
| `maxColumns` (`max-columns`) | `4` | Most columns shown when none are configured. |

<GeneratedRef />
