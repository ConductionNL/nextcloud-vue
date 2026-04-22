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
| `select` | Single choice from options (static or async) |
| `multiselect` | Multiple choices (static or async) |
| `tags` | Tag input (with optional async suggestions) |
| `checkbox` | Boolean toggle |
| `date` | Date picker |
| `datetime` | Date-time picker |
| `json` | JSON editor (CnJsonViewer). formData holds the parsed value; invalid JSON blocks confirm |
| `code` | Freeform code editor (CnJsonViewer). formData holds the raw string; syntax highlighting via `field.language` |

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
| `#field-\{key\}-option` | *option object properties* | Custom dropdown option rendering for a select/multiselect/tags field |
| `#field-\{key\}-selected-option` | *option object properties* | Custom selected option display for a select/multiselect/tags field |
| `#before-fields` | — | Content before fields |
| `#after-fields` | — | Content after fields |

The `#field-{key}-option` and `#field-{key}-selected-option` slots receive all properties of the option object as scope. They are forwarded directly to NcSelect's `#option` and `#selected-option` slots. When not provided, NcSelect uses its default label-based rendering.

## Public Methods

| Method | Description |
|--------|-------------|
| `validate()` | Client-side validation (returns boolean) |
| `setResult(result)` | Set operation result (pass success or error key) |
| `setValidationErrors(fieldErrors)` | Set server validation errors |

## Field Definition

When using the `fields` prop (manual field definitions), each field object supports:

| Property | Type | Description |
|----------|------|-------------|
| `key` | String | **Required.** Form data key and slot name suffix |
| `label` | String | **Required.** Display label |
| `widget` | String | **Required.** Widget type (see table above) |
| `required` | Boolean | Marks field as required |
| `readOnly` | Boolean | Disables the field |
| `description` | String | Helper text shown below the field |
| `default` | * | Default value for create mode |
| `enum` | Array \| Function | Options for `select` widget. Static array or async function (see below) |
| `items` | Object | For `multiselect`: `{ enum: [...] }` or `{ enum: asyncFn }` |
| `debounce` | Number | Debounce delay in ms for async enum search (default: 300) |
| `validation` | Object | `{ minLength, maxLength, minimum, maximum, pattern }` |
| `language` | String | For `code`: `'json' \| 'xml' \| 'html' \| 'text' \| 'auto'` (default `'auto'`) |

## JSON and code fields

For structured-data editing, use `widget: 'json'`; for freeform highlighted code, use `widget: 'code'`. Both render a [`CnJsonViewer`](cn-json-viewer.md) inline.

### `widget: 'json'`

Use when the schema property holds a structured value (object, array, primitive, or `null`). `fieldsFromSchema` skips `type: 'object'` by default — setting an explicit `widget` opts the property back in, so object-shaped values flow through.

```js
// schema
{
  title: 'Consumer',
  required: ['name'],
  properties: {
    name: { type: 'string', title: 'Name', required: true },
    authorizationConfiguration: {
      type: 'object',
      widget: 'json',
      title: 'Authorization configuration',
    },
  },
}
```

The editor shows pretty-printed JSON. On every keystroke the content is parsed: on success `formData.authorizationConfiguration` updates to the parsed value; on failure the previous value is preserved, an inline error appears, and the Confirm button is disabled until the JSON is valid. An empty editor resolves to `null`.

### `widget: 'code'`

Stores the raw string as-is — no parse, no validation.

```js
{
  type: 'string',
  widget: 'code',
  title: 'Template',
  language: 'html',
}
```

`language` may be `'json'`, `'xml'`, `'html'`, `'text'`, or `'auto'` (default `'auto'` — CnJsonViewer sniffs the content).

## Async Select

Select, multiselect, and tags fields support **async options** by setting `enum` (or `items.enum`) to an async function instead of a static array:

```js
{
  key: 'organisation',
  widget: 'select',
  label: 'Organisation',
  required: true,
  description: 'Type to search for organisations',
  enum: async (query) => {
    const results = await orgStore.search(query, 20, 0)
    return results.map(org => ({
      label: org.name,
      id: org.uuid,
      description: org.description,
      users: org.users,
    }))
  },
  debounce: 500,
}
```

**Behavior:**

- The function receives the search query string and must return an array of option objects
- Each option must have a `label` property (used by NcSelect for default display)
- Options are loaded on mount (called with `''`) and on each search input (debounced)
- Per-field loading state is shown via NcSelect's loading indicator
- `filterable` is automatically set to `false` for async fields (server-side filtering)
- Async selects store the **full option object** in `formData` (not just an ID)

**Static enums are unchanged** — arrays work exactly as before, storing just the ID value.

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

### Basic (schema-driven)

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

### Async select with custom option rendering

```vue
<CnFormDialog
  :fields="fields"
  dialog-title="Add User to Organisation"
  confirm-label="Add User"
  @confirm="onConfirm"
  @close="onClose">
  <!-- Rich dropdown options for organisation -->
  <template #field-organisation-option="{ name, description, users, isDefault }">
    <div class="org-option">
      <div>
        <strong>{{ name }}</strong>
        <span v-if="isDefault" class="badge">Default</span>
      </div>
      <p v-if="description">{{ description }}</p>
      <span class="meta">{{ users?.length || 0 }} members</span>
    </div>
  </template>

  <!-- Simpler display for the selected value -->
  <template #field-organisation-selected-option="{ name }">
    <span>{{ name }}</span>
  </template>

  <!-- Info note below the form -->
  <template #after-fields>
    <NcNoteCard type="info">
      Select an organisation to add the user as a member.
    </NcNoteCard>
  </template>
</CnFormDialog>
```

```js
// In setup / data:
const fields = [
  {
    key: 'organisation',
    widget: 'select',
    label: 'Organisation',
    required: true,
    enum: async (query) => {
      const results = await orgStore.search(query, 20, 0)
      return results.map(org => ({ label: org.name, id: org.uuid, ...org }))
    },
    debounce: 500,
  },
  {
    key: 'user',
    widget: 'select',
    label: 'User',
    enum: async (query) => {
      const users = await userApi.search(query)
      return users.map(u => ({ label: u.displayName, id: u.id }))
    },
  },
]
```
