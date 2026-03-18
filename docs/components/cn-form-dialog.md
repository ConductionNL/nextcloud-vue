---
sidebar_position: 18
---

# CnFormDialog

Schema-driven create/edit form dialog. Auto-generates form fields from a schema, supports multiple widget types, and follows the two-phase confirm/result pattern.

**Wraps**: NcDialog, NcButton, NcTextField, NcSelect, NcCheckboxRadioSwitch

![CnFormDialog showing the New client form with name, email, phone, and other fields](/img/screenshots/cn-form-dialog.png)

![CnFormDialog showing the New client form with name, email, phone, and other fields](/img/screenshots/cn-form-dialog.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `schema` | Object | `null` | Schema for auto-generating fields |
| `item` | Object | `null` | For edit mode (null = create) |
| `dialogTitle` | String | `''` | Defaults to "Create/Edit \{schema.title\}" |
| `fields` | Array | `null` | Manual field definitions (overrides schema) |
| `excludeFields` | Array | `[]` | Fields to hide |
| `includeFields` | Array | `null` | Fields to show (whitelist) |
| `fieldOverrides` | Object | `{}` | Per-field overrides (see [Field Overrides](#field-overrides)) |
| `nameField` | String | `'title'` | |
| `size` | String | `'normal'` | Dialog size |
| `successText` | String | `''` | |
| `cancelLabel` | String | | |
| `closeLabel` | String | | |
| `confirmLabel` | String | | |

## Widget Types

| Widget | Used For |
|--------|----------|
| `text` | Short strings |
| `email` | Email addresses |
| `url` | URLs |
| `number` | Numeric input |
| `textarea` | Long text |
| `select` | Single choice from options |
| `multiselect` | Multiple choices |
| `tags` | Tag input |
| `checkbox` | Boolean toggle |
| `date` | Date picker |
| `datetime` | Date-time picker |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `formData` | Form confirmed (includes id when editing) |
| `close` | — | Dialog closed |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `#form` | fields, formData, errors, updateField | Full form override |
| `#field-\{key\}` | field, value, error, updateField | Per-field override |
| `#before-fields` | — | Content before fields |
| `#after-fields` | — | Content after fields |

## Public Methods

| Method | Description |
|--------|-------------|
| `validate()` | Client-side validation (returns boolean) |
| `setResult(result)` | Set operation result (pass success or error key) |
| `setValidationErrors(fieldErrors)` | Set server validation errors |

## Field Overrides

The `fieldOverrides` prop accepts an object keyed by field name. Each override is merged onto the auto-generated field definition, so any field property can be changed.

### `enumLabels`

For `select` fields backed by an `enum`, the dropdown displays raw enum values by default. Use `enumLabels` to provide human-readable labels:

```js
fieldOverrides: {
  type: {
    enumLabels: { internal: 'Internal', mongodb: 'MongoDB' },
  },
}
```

The `enumLabels` object maps each enum value to its display label. Values without a mapping fall back to the raw value.

## Usage

```vue
<CnFormDialog
  :schema="schema"
  :item="editItem"
  :exclude-fields="['id', 'created', 'updated']"
  @confirm="onFormConfirm"
  @close="editItem = null">
  <!-- Custom field for 'notes' -->
  <template #field-notes="{ field, value, updateField }">
    <RichTextEditor :value="value" @input="updateField('notes', $event)" />
  </template>
</CnFormDialog>
```
