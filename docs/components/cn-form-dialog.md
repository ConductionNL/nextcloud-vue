---
sidebar_position: 18
---

import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnFormDialog.md'

# CnFormDialog

Schema-driven create/edit form dialog. Auto-generates form fields from a schema, supports multiple widget types, and follows the two-phase confirm/result pattern.

## Try it

<Playground component="CnFormDialog" />

**Wraps**: NcDialog, NcButton, NcTextField, NcSelect, NcCheckboxRadioSwitch

![CnFormDialog showing the New client form with name, email, phone, and other fields](/img/screenshots/cn-form-dialog.png)

![CnFormDialog showing the New client form with name, email, phone, and other fields](/img/screenshots/cn-form-dialog.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `schema` | Object | `null` | Schema for auto-generating fields |
| `item` | Object | `null` | For edit mode (null = create) |
| `register` | String | `''` | Register slug used to resolve OpenRegister object references (`$ref`). A schema property that is an object reference renders as a searchable dropdown of the referenced objects (label = human name, value = UUID). See [Object references](#object-references-ref). When empty, reference fields fall back to a plain text input. |
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
| `referenceContext` (`reference-context`) | Object \| null | `null` | Object context `{ register, schema, objectId }` forwarded to the integration single-entity widget rendered for fields that declare a `referenceType` (AD-18). Optional. |

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
| `user` | Single Nextcloud user (`referenceType: 'nextcloud-user'` / `format: 'user'`) — a searchable dropdown of real users rendered by the shared select branch as NC's native `:user-select` picker (stores the UID string). See [Nextcloud user references](#nextcloud-user-references) |
| `user-multiselect` | Multiple Nextcloud users — searchable multi-select (stores an array of UIDs) |
| `tags` | Tag input (with optional async suggestions) |
| `checkbox` | Boolean toggle |
| `switch` | Toggle over a 2-value `enum` (off → first value, on → last value) |
| `date` | Date picker |
| `datetime` | Date-time picker |
| `json` | JSON editor (CnJsonViewer). formData holds the parsed value; invalid JSON blocks confirm |
| `code` | Freeform code editor (CnJsonViewer). formData holds the raw string; syntax highlighting via `field.language` |
| `icon` | Icon picker ([CnIconPicker](cn-icon-picker.md)). Forwards `field.iconSources` → `sources` (default `['mdi']`), plus `field.catalogues` / `field.searchable` (default on) / `field.allowCustomSvg`. formData holds the selected icon value |

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
| `setResult(result)` | Set the terminal operation result (`{ success?, error? }`). Switches to the result phase, replacing the form. |
| `setValidationErrors(fieldErrors, message?)` | Show server validation errors **without leaving the form phase** so the user can fix the data. `fieldErrors` maps field key → message; the optional `message` is shown as a form-level error note above the fields. Use this for 400/422 responses instead of `setResult({ error })`. |

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

## Object references (`$ref`)

A schema property that is an OpenRegister object reference renders as a **searchable dropdown of the referenced objects** (label = human name, value = UUID) instead of a free-text UUID box:

```js
// schema
{
  title: 'Case',
  required: ['title', 'caseType'],
  properties: {
    title: { type: 'string', title: 'Title' },
    // single reference → searchable single-select
    caseType: { type: 'string', format: 'uuid', $ref: 'caseType', title: 'Case type' },
    // array of references → searchable multi-select
    contacts: { type: 'array', items: { $ref: 'contact' }, title: 'Contacts' },
  },
}
```

```vue {static}
<CnFormDialog :schema="schema" :register="'zaken'" @confirm="onConfirm" />
```

**Behavior:**

- `fieldsFromSchema` resolves a `$ref` property to a `select` widget (or `multiselect` for `items.$ref`) and records `field.reference = { schema, multiple }`. The `$ref` value is the referenced **schema** slug.
- Pass the **`register`** prop so the dialog can fetch the referenced objects via `GET /api/objects/{register}/{schema}` (limit 100, server-filtered by the search term).
- Each object is mapped to `{ label, value }` where the label resolves through `title → name → naam → label → identifier → @self.name → id`.
- The value stored in `formData` is the **UUID** (single) or **array of UUIDs** (multiple) — never the full object. In edit mode the stored UUID is resolved to its label so the current selection displays.
- When `register` is empty (or the fetch fails) the field falls back to a plain text input — no regression, no console spew.

`CnIndexPage` threads its own `register` into the built-in `CnFormDialog` automatically, so reference fields resolve out of the box on manifest-driven and self-fetch pages.

## Nextcloud user references (`referenceType: "nextcloud-user"`)

A schema property that represents a Nextcloud user renders as a **searchable dropdown of real Nextcloud users** (label = display name, value = UID) instead of a free-text box. Mark the property with `referenceType: "nextcloud-user"` (preferred) — `format: "user"` / `format: "username"` work too:

```js
const schema = {
  title: 'Case',
  properties: {
    // single user → searchable single-select (stores the UID string)
    assignee: { type: 'string', referenceType: 'nextcloud-user', title: 'Assignee' },
    // array of users → searchable multi-select (stores an array of UIDs)
    watchers: { type: 'array', items: { referenceType: 'nextcloud-user' }, title: 'Watchers' },
  },
}
```

```vue
<CnFormDialog :schema="schema" @confirm="onConfirm" />
```

**Behavior:**

- `fieldsFromSchema` resolves a user-marked property to a `user-select` widget (or `user-multiselect` for an array) and tags it `field.userPicker = { multiple }`.
- Users are loaded from the core **autocomplete OCS endpoint** (`GET /ocs/v2.php/core/autocomplete/get`), which is available to **every authenticated user** (not just admins). Each suggestion is mapped to `{ label: <display name>, value: <uid> }`. The search is debounced (300 ms).
- The value stored in `formData` is the **UID string** (single) or **array of UIDs** (multiple) — never the display object. In edit mode the stored UID is resolved to its display name so the current selection shows (falling back to the UID itself when the name can't be resolved).
- No `register` prop is needed. If the OCS call fails the picker fails soft (empty options, no console spew) and the stored UID still displays.
- A `#field-<key>` slot still overrides the picker entirely.

### Inline create (`x-allow-create`)

Add `x-allow-create: true` (or `allowCreate: true`) to a **single** `$ref` property and the field renders [`CnResourceSelect`](./cn-resource-select.md) instead of a read-only select — the user can pick an existing object **or** type a new term to create one inline (the term is written to the reference schema's label field, default `name`):

```js
// single reference the user can pick OR create
ocName: { type: 'string', format: 'uuid', $ref: 'player', 'x-allow-create': true, title: 'Player' }
```

The stored value is still the chosen (or freshly-created) object's UUID. Without the flag, a `$ref` stays a plain select of existing objects.

## Nextcloud-user picker (`format: "user"`, `widget: "user"`)

A `{ type: 'string', format: 'user' }` property renders a user picker that async-searches Nextcloud users (via the core `autocomplete/get` OCS endpoint) and stores the selected **uid** string. In edit mode the stored uid is resolved to its display name for the label.

```js
userUid: { type: 'string', format: 'user', title: 'Nextcloud user' }
```

## Enum toggle (`widget: "switch"`)

A 2-value `enum` property with `widget: 'switch'` renders as a toggle instead of a select: off maps to the **first** enum value, on maps to the **last**. The stored value stays an enum string, so an enum-driven `x-openregister-lifecycle` keeps working.

```js
approved: { type: 'string', enum: ['no', 'approved'], widget: 'switch', title: 'Approved' }
```

## Cross-app semantic references (`referenceSemanticType`)

The semantic sibling of the `$ref` mechanism (ADR-048). A schema property can point at a **canonical semantic-type URI** instead of a local schema slug, so the form binds to whichever installed app provides that type — regardless of which register/schema it lives in:

```js
// schema
{
  title: 'Product',
  properties: {
    // resolves to the provider schema that implements this URI, in ANY app
    supplier: {
      type: 'string',
      title: 'Supplier',
      referenceSemanticType: 'https://schema.org/Organization',
      referenceSemanticApp: 'shillinq', // optional — names the expected provider app
    },
  },
}
```

**Behavior:**

- `fieldsFromSchema` surfaces `field.referenceSemanticType` and `field.referenceSemanticApp` onto the field descriptor (both `null` when the keys are absent — no behaviour change).
- On mount the dialog resolves each distinct URI **once** against OpenRegister's discovery endpoint `GET /apps/openregister/api/schemas/resolve-by-implements?uri=<uri>` → `{ resolved, registerSlug, schemaSlug, appId }`. Resolution is async; results are cached per URI, so the endpoint is hit at most once per URI, never per render.
- **Resolved** (some installed schema implements the URI) → the field is transformed into a `$ref` reference field pointed at the **provider's** register (`registerSlug`) and schema (`schemaSlug`) and rendered as a searchable object picker over that cross-app register. The chosen object's **UUID** is stored as the value.
- **Unresolved** (no installed provider, or the endpoint 404s / errors) → the field renders **disabled** with a mouse-over `title` tooltip and helper text: *"The {appLabel} app that provides {typeLabel} is not installed."* `typeLabel` is derived from the URI's last path segment; `appLabel` from `referenceSemanticApp` (fallback: a generic "supporting app"). The rest of the form stays fully editable and saveable.
- **While loading** → the field renders disabled (loading) and never crashes.

This reuses the same `register` fetch machinery as `$ref`, targeting the provider's register rather than the form's own `register` prop — so no extra props are needed.

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

## Live demo

```vue
<template>
  <div>
    <button @click="open = true" style="padding: 6px 16px; border-radius: 4px; background: var(--color-primary-element); color: white; border: none; cursor: pointer;">New contact</button>
    <CnFormDialog
      v-if="open"
      ref="dlg"
      dialog-title="New contact"
      :fields="fields"
      @confirm="onConfirm"
      @close="open = false" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      open: false,
      fields: [
        { key: 'name', label: 'Name', widget: 'text', required: true },
        { key: 'email', label: 'Email', widget: 'email' },
        { key: 'notes', label: 'Notes', widget: 'textarea' },
      ],
    }
  },
  methods: {
    async onConfirm(formData) {
      await new Promise(r => setTimeout(r, 800))
      this.$refs.dlg.setResult({ success: true })
    },
  },
}
</script>
```

## Usage

### Basic (schema-driven)

```vue {static}
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

```vue {static}
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

```js {static}
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

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnFormDialog.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnFormDialog/CnFormDialog.vue) and update automatically whenever the component changes.

<GeneratedRef />
