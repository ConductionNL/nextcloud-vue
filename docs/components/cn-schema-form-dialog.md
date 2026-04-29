---
sidebar_position: 20
---

# CnSchemaFormDialog

Full-featured JSON Schema editor dialog for creating and editing JSON Schemas. Provides three tabs — **Properties** (sortable table with inline editing), **Configuration** (schema composition, field mappings, validation options), and **Security** (RBAC group permissions).

---

:::warning Custom NcNoteCard
This component uses `CnNoteCard` (from `@conduction/nextcloud-vue`) instead of Nextcloud's built-in `NcNoteCard`. `CnNoteCard` is a local patch of `NcNoteCard` required to work around limitations in the installed version of `@nextcloud/vue`. Do not replace it with `NcNoteCard` without verifying compatibility first.
:::

## Overview

CnSchemaFormDialog is a **props-driven, emit-based** component that does not perform any API calls itself. It collects and validates JSON Schema data, then emits it for the parent to handle.

The dialog operates in two modes:
- **Create mode** — when `item` is `null` (or has no `id`), the form starts with a blank schema template
- **Edit mode** — when `item` has an `id`, the form is pre-populated with the existing schema data

It follows the same **two-phase confirm → result pattern** as CnFormDialog and CnAdvancedFormDialog:

1. User fills out the form and clicks the primary button (Create / Save)
2. Component emits `confirm` with the cleaned schema data
3. Parent performs the API call and calls `setResult()` via a ref
4. Result phase shows success or error; auto-closes on success after 2 seconds

### Key features

- **Properties tab**: Sortable table of schema properties with click-to-edit rows. Each property supports type selection, format, required flag, `$ref` references to other schemas, enum values, default values, validation constraints (`minLength`, `maxLength`, `minimum`, `maximum`, `pattern`, `minItems`, `maxItems`), and nested object/array configuration. Properties can be reordered, added, and deleted.
- **Configuration tab**: Schema description, slug, version, allOf/oneOf/anyOf composition selectors, object field mappings (name, description, image, summary), file upload settings, allowed tags, hard validation toggle, and searchable toggle.
- **Security tab**: RBAC permissions table with per-group Create/Read/Update/Delete toggles. Includes built-in rows for `public` (anonymous), `user` (authenticated), and `admin` (always full access, disabled). Custom user groups are shown alphabetically between `user` and `admin`. Property-level permissions can also be configured per property via the action menu.
- **Optional action buttons**: Extend Schema, Analyze Properties, Validate Objects, Delete Objects, Publish Objects, and Delete. Each is toggled via a boolean prop and emits an event — the parent handles the actual logic.
- **External data via props**: All data dependencies (schemas, registers, user groups, tags) are passed as props. When a data source is unavailable (empty array), dependent fields are automatically disabled or show empty options.

---

## Props

### Core props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `item` | `Object` | `null` | The existing schema object for edit mode. Pass `null` or omit for create mode. When provided, must have an `id` property to trigger edit mode. The component deep-clones this value — the original is never mutated. |
| `dialogTitle` | `String` | `''` | Override the dialog title. When empty, defaults to `'Create Schema'` (create mode) or `'Edit Schema'` (edit mode). |
| `size` | `String` | `'large'` | NcDialog size. Passed directly to `<NcDialog :size>`. Valid values: `'small'`, `'normal'`, `'large'`, `'full'`. |

### External data props

These props feed external data into the form. The component never fetches data on its own — the parent is responsible for loading and passing this data.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `availableSchemas` | `Array` | `[]` | List of schemas available for `$ref` references and allOf/oneOf/anyOf composition. Each entry should have `{ id, title, description, slug? }`. Used in the Configuration tab's composition selectors and in property `$ref` dropdowns. When empty, composition selectors show no options and `$ref` fields have no selectable schemas. |
| `availableRegisters` | `Array` | `[]` | List of registers available for object property configuration. Each entry should have `{ id, label }` (or `{ id, title }`). Used in the property detail panel when a property's type is `object` or when an array's items type is `object` — the user can select which register the related objects belong to. When empty, the register dropdown shows no options. |
| `userGroups` | `Array` | `[]` | User groups for the Security (RBAC) tab. Each entry should have `{ id, displayname }`. The groups `admin` and `public` are automatically filtered out from this list since they have dedicated rows. Groups are sorted alphabetically by display name. When empty, only the built-in `public`, `user`, and `admin` rows are shown. |
| `availableTags` | `Array` | `[]` | Tags available for the file property tag configuration. Array of strings (e.g. `['image', 'document', 'audio']`). Used in the property detail panel when a property has `type: 'file'` to configure allowed file tags. When empty, the tag selector shows no options. |
| `loadingGroups` | `Boolean` | `false` | Whether user groups are still being loaded by the parent. When `true`, the Security tab shows a loading indicator instead of the RBAC table. Set this to `true` while fetching groups, then `false` once `userGroups` is populated. |
| `objectCount` | `Number` | `0` | Number of objects currently attached to this schema. Used for two purposes: (1) the "Delete Objects" and "Publish Objects" buttons are disabled when `objectCount === 0` (nothing to act on), and (2) the "Delete" (schema) button is disabled when `objectCount > 0` (cannot delete a schema with attached objects). |

### Action button visibility props

These boolean props control whether optional action buttons appear in the dialog footer. All default to `false` (hidden). Action buttons only appear in **edit mode** — they are never shown in create mode regardless of these props.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showExtendSchema` | `Boolean` | `false` | Show the "Extend Schema" button. When clicked, emits `extend-schema`. Use case: creating a child schema that inherits from the current schema. |
| `showAnalyzeProperties` | `Boolean` | `false` | Show the "Analyze Properties" button. When clicked, emits `analyze-properties`. Use case: opening an analysis dialog that inspects property usage across objects. |
| `showValidateObjects` | `Boolean` | `false` | Show the "Validate Objects" button. When clicked, emits `validate-objects`. Use case: triggering validation of all objects against this schema. |
| `showDeleteObjects` | `Boolean` | `false` | Show the "Delete Objects" button. When clicked, emits `delete-objects`. **Disabled** when `objectCount === 0`. Shows `deleteObjectsTooltip` on hover when enabled, `noDeleteObjectsTooltip` when disabled. |
| `showPublishObjects` | `Boolean` | `false` | Show the "Publish Objects" button. When clicked, emits `publish-objects`. **Disabled** when `objectCount === 0`. Shows `publishObjectsTooltip` on hover when enabled, `noPublishObjectsTooltip` when disabled. |
| `showDelete` | `Boolean` | `false` | Show the "Delete" (schema) button (red/error style). When clicked, emits `delete-schema`. **Disabled** when `objectCount > 0` (shows `cannotDeleteTooltip` on hover). |

#### Interaction between `objectCount` and action buttons

The `objectCount` prop creates important interactions with three action buttons:

| Button | `objectCount === 0` | `objectCount > 0` |
|--------|---------------------|-------------------|
| Delete Objects | Disabled (nothing to delete) | Enabled |
| Publish Objects | Disabled (nothing to publish) | Enabled |
| Delete (schema) | Enabled (safe to delete) | Disabled (must delete objects first) |

### Label and text props

All labels accept pre-translated strings with English defaults. Use these to localize the dialog for your app. Never import `t()` inside this component — pass translated strings from the parent.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `cancelLabel` | `String` | `'Cancel'` | Label for the cancel button (shown during form phase). |
| `closeLabel` | `String` | `'Close'` | Label for the close button (shown during result phase). |
| `confirmLabel` | `String` | `''` | Label for the primary action button. When empty, defaults to `'Create'` (create mode) or `'Save'` (edit mode). |
| `successText` | `String` | `''` | Success message shown in the result phase. When empty, defaults to `'Schema saved successfully.'`. |
| `extendSchemaLabel` | `String` | `'Extend schema'` | Label for the Extend Schema action button. |
| `analyzePropertiesLabel` | `String` | `'Analyze properties'` | Label for the Analyze Properties action button. |
| `validateObjectsLabel` | `String` | `'Validate objects'` | Label for the Validate Objects action button. |
| `deleteObjectsLabel` | `String` | `'Delete objects'` | Label for the Delete Objects action button. |
| `publishObjectsLabel` | `String` | `'Publish objects'` | Label for the Publish Objects action button. |
| `deleteLabel` | `String` | `'Delete'` | Label for the Delete (schema) action button. |
| `deleteObjectsTooltip` | `String` | `'Delete all objects in this schema'` | Tooltip shown on the Delete Objects button when it is enabled. |
| `publishObjectsTooltip` | `String` | `'Publish all objects in this schema'` | Tooltip shown on the Publish Objects button when it is enabled. |
| `noDeleteObjectsTooltip` | `String` | `'No objects to delete'` | Tooltip shown on the Delete Objects button when disabled (objectCount is 0). |
| `noPublishObjectsTooltip` | `String` | `'No objects to publish'` | Tooltip shown on the Publish Objects button when disabled (objectCount is 0). |
| `cannotDeleteTooltip` | `String` | `'Cannot delete: objects are still attached'` | Tooltip shown on the Delete (schema) button when disabled (objectCount > 0). |

---

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `cleanedSchemaData` (Object) | Emitted when the user clicks the primary button (Create/Save). The payload is a deep-cloned, cleaned-up copy of the schema form data. The parent should perform the API save and then call `setResult()`. |
| `close` | — | Emitted when the dialog should close: user clicks Cancel/Close, or auto-close after successful result. |
| `extend-schema` | — | Emitted when the Extend Schema button is clicked. Only available when `showExtendSchema` is `true` and in edit mode. |
| `analyze-properties` | — | Emitted when the Analyze Properties button is clicked. Only available when `showAnalyzeProperties` is `true` and in edit mode. |
| `validate-objects` | — | Emitted when the Validate Objects button is clicked. Only available when `showValidateObjects` is `true` and in edit mode. |
| `delete-objects` | — | Emitted when the Delete Objects button is clicked. Only available when `showDeleteObjects` is `true`, in edit mode, and `objectCount > 0`. |
| `publish-objects` | — | Emitted when the Publish Objects button is clicked. Only available when `showPublishObjects` is `true`, in edit mode, and `objectCount > 0`. |
| `delete-schema` | — | Emitted when the Delete button is clicked. Only available when `showDelete` is `true`, in edit mode, and `objectCount === 0`. |

---

## Public methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `setResult` | `setResult({ success?: boolean, error?: string })` | Switch to the result phase. Pass `{ success: true }` to show the success message and auto-close after 2 seconds. Pass `{ error: 'message' }` to show the error. Call this from your `@confirm` handler after the API call completes. |

---

## Tabs

### Properties tab

The Properties tab is a sortable table where each row represents one property of the JSON Schema. The table has three columns: **Name**, **Type**, and **Actions**.

**Row behavior:**
- Click a row to select it and expand an inline editing panel below the row
- The selected row is highlighted with a primary color background and left border
- Modified properties (compared to the original `item`) get a warning-colored background
- Properties are sorted by their `order` field first, then by creation date

**Inline editing panel** (shown when a property row is selected):
- **Property name** — editable text field (the JSON Schema property key)
- **Type** — dropdown with options: String, Number, Integer, Boolean, Array, Object, Dictionary, File, One Of
- **Format** — type-dependent format dropdown (e.g. `text`, `markdown`, `date-time`, `email` for strings)
- **Required** toggle
- **Immutable** toggle (property value cannot be changed after creation)
- **Searchable** toggle
- **Description** textarea
- **Default value** text field
- **Example value** text field
- **$ref** — dropdown to reference another schema (populated from `availableSchemas`)
- **inversedBy** — text field for bidirectional relationships
- **Enum values** — add/remove allowed values
- **Validation constraints** — `minLength`, `maxLength`, `minimum`, `maximum`, `pattern`, `minItems`, `maxItems` (shown based on property type)
- **Object configuration** — when type is `object`, shows handling mode dropdown (`nested-object`, `related-object`, `file-reference`, etc.), register selector (from `availableRegisters`), schema selector (from `availableSchemas`), and query params
- **Array item configuration** — when type is `array`, shows item type dropdown and nested object/schema configuration for array items
- **File configuration** — when type is `file`, shows allowed tags selector (from `availableTags`)
- **Property-level RBAC** — per-property permissions (accessed via the action menu)

**Actions column** per row:
- Move up / Move down (reorder)
- Delete property
- Duplicate property

### Configuration tab

The Configuration tab provides schema-level settings:

- **Description** — textarea for the schema's description
- **Slug** — text field for the URL-friendly identifier
- **Summary** — text field for a brief summary
- **Schema Composition (allOf/oneOf/anyOf)** — three multiselect dropdowns populated from `availableSchemas`:
  - **allOf**: Instance must validate against ALL selected schemas. Properties are merged.
  - **oneOf**: Instance must validate against EXACTLY ONE selected schema. Properties are NOT merged.
  - **anyOf**: Instance must validate against AT LEAST ONE selected schema. Properties are NOT merged.
  - Each shows an info card when schemas are selected explaining the composition semantics
- **Object Field Mappings** — dropdowns (populated from current schema properties) to select:
  - Object Name Field
  - Object Description Field
  - Object Image Field
  - Object Summary Field
- **Allow Files** toggle
- **Auto-Publish Objects** toggle
- **Allowed Tags** — comma-separated text input
- **Hard Validation** toggle
- **Searchable** toggle (not shown, controlled at schema level)
- **Max Depth** — depth limit for nested object resolution

### Security tab

The Security tab provides a Role-Based Access Control (RBAC) table and an advanced conditional access rules section.

**RBAC table:**
- **Columns**: Group, Create, Read, Update, Delete
- **Built-in rows** (always shown):
  - `public` — anonymous/unauthenticated users
  - `authenticated` — all authenticated users
  - `admin` — always has full access, all toggles disabled/checked
- **Custom group rows** — populated from the `userGroups` prop, sorted alphabetically, shown between `authenticated` and `admin`
- **Loading state** — when `loadingGroups` is `true`, a spinner is shown instead of the table
- **Summary cards** — below the table:
  - "Open access" (success) when no permissions are set
  - "Restrictive schema" (warning) when permissions restrict access to specific groups

**Advanced: Conditional access rules** (accordion, collapsed by default):

Grant access based on object property values evaluated at runtime. Conditions are per-action (create/read/update/delete). Multiple rules per action are OR'd — any matching rule grants access.

Each rule has:
- A **group** (public, authenticated, or a named user group)
- One or more **match conditions**: `property → operator → value`

Supported operators: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$exists`

Special value variables: `$now` (current date/time), `$userId` (current user ID), `$organisation` (current organisation)

---

## Schema data structure

The component internally manages a `schemaItem` data object with this structure:

```js
{
  // Metadata (populated from item in edit mode)
  id: '',
  uuid: '',
  title: '',           // Required — confirm button disabled when empty
  version: '0.0.0',
  description: '',
  summary: '',
  slug: '',
  created: '',
  updated: '',
  owner: '',
  extend: '',          // Parent schema ID (for schema inheritance)

  // Properties
  properties: {
    propertyName: {
      type: 'string',
      format: 'text',
      required: false,
      description: '',
      default: null,
      example: null,
      enum: [],
      minLength: null,
      maxLength: null,
      minimum: null,
      maximum: null,
      pattern: '',
      $ref: '',
      inversedBy: '',
      immutable: false,
      searchable: true,
      order: 0,
      objectConfiguration: {
        handling: 'nested-object',
        register: '',
        schema: '',
        queryParams: '',
      },
      items: { /* array item config */ },
      authorization: {},
    }
  },

  // Composition
  allOf: [],           // Array of schema objects from availableSchemas
  oneOf: [],
  anyOf: [],

  // Configuration
  configuration: {
    objectNameField: '',
    objectDescriptionField: '',
    objectImageField: '',
    objectSummaryField: '',
    allowFiles: false,
    allowedTags: [],
    autoPublish: false,
  },

  // Security
  authorization: {
    create: [],        // Array of group IDs
    read: [],
    update: [],
    delete: [],
  },

  // Flags
  hardValidation: false,
  immutable: false,
  searchable: true,
  maxDepth: 0,
}
```

---

## Two-phase flow (confirm → result)

1. User fills the form across any of the three tabs and clicks the primary button (Create / Save).
2. The component cleans up the schema data (normalizes `$ref` values, removes legacy fields) and emits `confirm` with the cleaned payload.
3. The parent receives the payload, performs the API call, and calls `this.$refs.schemaForm.setResult({ success: true })` or `setResult({ error: 'Failed to save' })`.
4. The result phase shows a success or error NcNoteCard. On success, the dialog auto-closes after 2 seconds. On error, the user can close manually.

---

## Usage examples

### Basic create/edit (standalone)

```vue
<template>
  <CnSchemaFormDialog
    ref="schemaForm"
    :item="editSchema"
    :available-schemas="allSchemas"
    :available-registers="allRegisters"
    :user-groups="groups"
    :loading-groups="loadingGroups"
    :available-tags="tags"
    @confirm="onConfirm"
    @close="editSchema = null"
  />
</template>

<script>
export default {
  data() {
    return {
      editSchema: null, // null = create mode, object = edit mode
      allSchemas: [],
      allRegisters: [],
      groups: [],
      loadingGroups: false,
      tags: ['image', 'document', 'audio', 'video'],
    }
  },
  methods: {
    async onConfirm(schemaData) {
      try {
        if (schemaData.id) {
          await api.updateSchema(schemaData.id, schemaData)
        } else {
          await api.createSchema(schemaData)
        }
        this.$refs.schemaForm.setResult({ success: true })
      } catch (e) {
        this.$refs.schemaForm.setResult({ error: e.message })
      }
    },
  },
}
</script>
```

### With all action buttons (edit mode)

```vue
<CnSchemaFormDialog
  ref="schemaForm"
  :item="schema"
  :available-schemas="allSchemas"
  :available-registers="allRegisters"
  :user-groups="groups"
  :loading-groups="loadingGroups"
  :object-count="schema.objectCount || 0"
  show-extend-schema
  show-analyze-properties
  show-validate-objects
  show-delete-objects
  show-publish-objects
  show-delete
  @confirm="onConfirm"
  @close="closeDialog"
  @extend-schema="handleExtendSchema"
  @analyze-properties="openAnalyzeModal"
  @validate-objects="openValidateModal"
  @delete-objects="openDeleteObjectsModal"
  @publish-objects="openPublishModal"
  @delete-schema="openDeleteSchemaModal"
/>
```

### With translations (i18n)

```vue
<CnSchemaFormDialog
  ref="schemaForm"
  :item="schema"
  :available-schemas="allSchemas"
  :dialog-title="t('myapp', 'Edit Schema')"
  :cancel-label="t('myapp', 'Cancel')"
  :close-label="t('myapp', 'Close')"
  :confirm-label="t('myapp', 'Save')"
  :success-text="t('myapp', 'Schema saved successfully.')"
  :extend-schema-label="t('myapp', 'Extend Schema')"
  :delete-label="t('myapp', 'Delete')"
  :delete-objects-tooltip="t('myapp', 'Delete all objects in this schema')"
  :cannot-delete-tooltip="t('myapp', 'Cannot delete: objects are still attached')"
  @confirm="onConfirm"
  @close="closeDialog"
/>
```

### Inside CnIndexPage (slot override)

```vue
<CnIndexPage
  :schema="schema"
  :objects="items"
  :pagination="pagination"
  :loading="loading"
  @refresh="fetchItems"
>
  <template #form-dialog="{ item, close }">
    <CnSchemaFormDialog
      ref="schemaForm"
      :item="item"
      :available-schemas="allSchemas"
      :available-registers="allRegisters"
      :user-groups="groups"
      :loading-groups="loadingGroups"
      :available-tags="tags"
      :object-count="item ? item.objectCount || 0 : 0"
      show-extend-schema
      show-delete
      @confirm="onConfirm"
      @close="close"
      @extend-schema="handleExtend(item)"
      @delete-schema="handleDelete(item)"
    />
  </template>
</CnIndexPage>
```

### Minimal create-only (no external data)

```vue
<CnSchemaFormDialog
  ref="schemaForm"
  dialog-title="New Schema"
  @confirm="onConfirm"
  @close="showDialog = false"
/>
```

When no `availableSchemas`, `availableRegisters`, `userGroups`, or `availableTags` are provided, the corresponding form controls show empty dropdowns or are disabled. The dialog is still fully functional for basic schema creation — the user can add properties, set types, configure field mappings, etc.

---

## Comparison with other dialog components

| Feature | CnFormDialog | CnAdvancedFormDialog | CnSchemaFormDialog |
|---------|-------------|----------------------|--------------------|
| Purpose | Generic object create/edit | Complex object with JSON editing | JSON Schema definition editing |
| Layout | Vertical form fields | Tabs: Properties table, Metadata, JSON | Tabs: Properties, Configuration, Security |
| Properties | Auto-generated from schema | Click-to-edit table + raw JSON | Full property editor with type/format/validation/refs |
| Composition | — | — | allOf / oneOf / anyOf schema composition |
| RBAC | — | — | Group-level CRUD permission matrix |
| Size | Configurable | Fixed `large` | Configurable (default `large`) |
| External data | Schema for field generation | Schema for property list | Schemas, registers, groups, tags |
| Action buttons | — | — | 6 optional action buttons with events |
| Best for | Simple CRUD forms | Power users, JSON editing | Schema/metadata management |

All three follow the same two-phase confirm → result pattern and `setResult()` API.

---

## Property type behavior

Different property types enable different editing controls:

| Type | Format options | Extra controls |
|------|---------------|----------------|
| `string` | text, markdown, html, date-time, date, time, duration, email, idn-email, hostname, idn-hostname, ipv4, ipv6, uri, uri-reference, iri, iri-reference, uuid, json-pointer, relative-json-pointer, regex, bsn, rsin, kvk, btw, iban | minLength, maxLength, pattern, enum, default, example |
| `number` | number, float, double, decimal, currency | minimum, maximum, default, example |
| `integer` | int32, int64 | minimum, maximum, default, example |
| `boolean` | — | default |
| `array` | — | minItems, maxItems, item type (with full nested config for object items) |
| `object` | — | handling mode (nested-object, related-object, etc.), register, schema, queryParams |
| `dictionary` | — | — |
| `file` | — | allowed tags (from `availableTags`) |
| `oneOf` | — | — |

---

## Tips

- **Property modification tracking**: The component tracks whether properties have been modified compared to the original `item`. Modified properties get a visual warning indicator. This tracking resets after a successful save.
- **Property ordering**: Properties with an `order > 0` are shown first (sorted by order), then remaining properties sorted by creation date.
- **$ref resolution**: When a property has a `$ref` to another schema, the component looks up the referenced schema in `availableSchemas` by slug, ID, or title using an internal `findSchemaBySlug()` helper. If the referenced schema is not found in `availableSchemas`, the reference still works but the display name cannot be resolved.
- **Schema inheritance**: If the schema has an `extend` field pointing to a parent schema ID, the dialog shows an info card at the top of the Properties tab explaining the inheritance relationship and listing inherited properties.
- **Clipboard**: The ID/UUID section in the metadata header has a copy-to-clipboard button.
