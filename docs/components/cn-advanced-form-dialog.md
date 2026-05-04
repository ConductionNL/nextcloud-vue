---
sidebar_position: 19
---

# CnAdvancedFormDialog

Create/edit dialog with a **properties table** (click-to-edit), **Data (JSON)** tab with CodeMirror, and optional **Metadata** tab. Suited for power users and complex objects. When `item` is `null` the dialog runs in create mode; when `item` is provided it runs in edit mode.

**Wraps**: NcDialog, NcButton, NcNoteCard, NcLoadingIcon, NcTextField, NcCheckboxRadioSwitch, CodeMirror (vue-codemirror6)

Use **CnAdvancedFormDialog** when you need:
- Inline editing of object properties in a table (click row → edit value)
- Raw JSON view and editing with validation
- Metadata display (id, created, updated) in edit mode

Use **CnFormDialog** when you need a simpler form with auto-generated fields and standard widgets (text, select, checkbox, etc.) without the table/JSON tabs. CnFormDialog also has native `json` and `code` widgets (backed by [`CnJsonViewer`](cn-json-viewer.md)) for single-field JSON/code editing — reach for those before CnAdvancedFormDialog when the richer properties table and metadata tab aren't needed.

---

## Overview

CnAdvancedFormDialog provides:

1. **Properties tab** — Table of all schema properties (and existing object keys). Click a row to edit the value inline. Supports `string`, `number`, `integer`, `boolean` with appropriate inputs; other types are read-only and shown as formatted/JSON. Rows can show validation state (valid/invalid/new/warning) when `validationDisplay="indicator"`.
2. **Metadata tab** — Read-only display of ID, Created, Updated (from `@self` or `id` / item). Shown by default only in edit mode; controllable via `showMetadataTab`.
3. **Data tab** — Full JSON editor (CodeMirror) synced with the form data. Invalid JSON blocks confirm. "Format JSON" button prettifies the content.

The dialog uses the same **two-phase pattern** as other CRUD dialogs: after the user confirms, `@confirm` is emitted with the payload. The parent performs the API call and calls `setResult({ success: true })` or `setResult({ error: 'Message' })` to show the result phase and optional auto-close.

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `schema` | Object | `null` | JSON Schema used to derive property list, types, and labels (e.g. `schema.properties`, `schema.required`, `schema.title`) |
| `item` | Object | `null` | Existing object for edit mode; `null` for create mode |
| `dialogTitle` | String | `''` | Override dialog title; default is "Create \{schemaTitle\}" or "Edit \{schemaTitle\}" |
| `nameField` | String | `'title'` | Property used as display name (e.g. in breadcrumbs or other UI) |
| `successText` | String | `''` | Message shown in result phase on success; default "\{schemaTitle\} saved successfully." |
| `cancelLabel` | String | `'Cancel'` | Label for cancel button in form phase |
| `closeLabel` | String | `'Close'` | Label for close button in result phase |
| `confirmLabel` | String | `''` | Label for primary action; default "Create" (create) or "Save" (edit) |
| `excludeFields` | Array | `[]` | Property keys to hide from the properties table and from generated fields |
| `includeFields` | Array | `null` | If set, only these property keys are shown (whitelist) |
| `fieldOverrides` | Object | `{}` | Per-property overrides passed to `fieldsFromSchema` (e.g. label, widget hints) |
| `showPropertiesTable` | Boolean | `true` | Show the Properties tab |
| `showJsonTab` | Boolean | `true` | Show the Data (JSON) tab |
| `showMetadataTab` | Boolean | `null` | Force show/hide Metadata tab; `null` = show only when `item` is set (edit mode) |
| `editablePropertyTypes` | Array | `null` | Schema types that are editable in the table; default `['string','number','integer','boolean','array','object']` |
| `validationDisplay` | String | `'indicator'` | `'indicator'` = show validation state on rows (valid/invalid/new/warning); `'none'` = no indicator |
| `jsonEditorDark` | Boolean | `false` | Use dark theme for the CodeMirror JSON editor |

---

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `formData` | Emitted when the user confirms. Payload is the current form data (may include `id` in edit mode). Parent is responsible for performing the save and calling `setResult()`. |
| `close` | — | Emitted when the dialog is closed (user clicks close/cancel or after result auto-close). |

---

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `#form` | formData, updateField, objectProperties, jsonData, updateJson, isValidJson | Replace the entire form content (all tabs). Use for fully custom UI while still using the dialog chrome and confirm/close flow. |
| `#register-schema-selection` | proceed | Optional step before the main tabs (e.g. choose register/schema). When this slot is provided, the main tabs are not shown until the consumer calls `proceed()`. |
| `#tab-properties` | formData, updateField, objectProperties, selectedProperty, handleRowClick, getPropertyDisplayName, getPropertyValidationClass, isPropertyEditable, validationDisplay | Override the Properties tab content. Default is the built-in properties table. |
| `#tab-metadata` | item, formData | Override the Metadata tab content. Default is a table with ID, Created, Updated. |
| `#tab-data` | jsonData, updateJson, isValid, formatJSON | Override the Data (JSON) tab content. Default is CodeMirror + "Format JSON" button. |
| `#actions-left` | — | Content to the left of the Cancel/Close button in the dialog footer |
| `#actions-right` | — | Content to the right of the primary Confirm button in the dialog footer |

---

## Public methods

| Method | Description |
|--------|-------------|
| `setResult(resultData)` | Switch to result phase. `resultData` is `{ success: true }` or `{ error: 'message' }`. On success, the dialog typically auto-closes after 2 seconds. Call from `@confirm` handler or from `afterSave` when using the store. |

---

## Two-phase flow (confirm → result)

1. User fills the form and clicks the primary button (Create/Save).
2. Component emits `confirm` with the form payload.
3. Parent performs the save (e.g. via API or store) and calls `this.$refs.advancedForm.setResult({ success: true })` or `setResult({ error: '...' })`.
4. Result phase shows success or error message; user can close or the dialog auto-closes after success.

---

## Properties table behavior

- **Editable types**: By default `string`, `number`, `integer`, `boolean`, `array`, and `object` are editable in the table — strings get type-specific HTML5 inputs from their `format`, arrays get a comma-separated input, and objects get a CodeMirror JSON editor. Use `editablePropertyTypes` to restrict (e.g. lock arrays and objects to read-only).
- **Row selection**: Clicking a row selects it and shows an inline input for editable properties; clicking outside or on another row commits the value. 
  - **Exception: boolean properties** always render as a visible toggle switch — no row click is needed to activate editing.
- **Validation**: Rows can get CSS classes for valid/invalid/new/warning when `validationDisplay === 'indicator'`. Properties with `const` or `immutable` (with existing value) are not editable and show a lock icon.
- **Excluded keys**: `id` and `@self` are always excluded from the properties list. Use `excludeFields` / `includeFields` to further filter.

---

## Tooltip directive

This component uses the `v-tooltip` directive from `@nextcloud/vue`.

The Tooltip directive is imported and registered **locally** inside `CnAdvancedFormDialog`:

This means the directive is self-contained — it works even if the consuming app has not registered `v-tooltip` globally.


---

## JSON tab and sync

- The Data tab shows a CodeMirror editor bound to the same logical data as the properties table.
- Changes in the JSON editor are parsed and applied to `formData` when the JSON is valid; changes in the form (properties table or slots) are reflected in the JSON string.
- Confirming with invalid JSON is disabled; the user must fix the JSON or switch to the Properties tab to fix values.

---

## Metadata tab

- Shown by default only when `item` is set (edit mode). Override with `showMetadataTab`.
- Default content shows ID, Created, Updated from `formData['@self']` or `item['@self']`, or `formData.id` / `item.id` and related fields. Override with `#tab-metadata`.

---

## Usage examples

### Standalone (emit confirm, parent saves)

```vue
<CnAdvancedFormDialog
  ref="advancedForm"
  :schema="schema"
  :item="editItem"
  :exclude-fields="['@self', 'id']"
  @confirm="onConfirm"
  @close="editItem = null"
/>

// In parent:
async onConfirm(payload) {
  try {
    await api.save(payload)
    this.$refs.advancedForm.setResult({ success: true })
  } catch (e) {
    this.$refs.advancedForm.setResult({ error: e.message })
  }
}
```

### With CnIndexPage (useAdvancedFormDialog)

```vue
<CnIndexPage
  title="Items"
  :schema="schema"
  :objects="items"
  :pagination="pagination"
  :loading="loading"
  use-advanced-form-dialog
  @create="onCreate"
  @edit="onEdit"
  @refresh="fetchItems"
/>
```

### Custom Properties tab

```vue
<CnAdvancedFormDialog :schema="schema" :item="item" @confirm="onConfirm" @close="close">
  <template #tab-properties="{ formData, updateField, objectProperties }">
    <MyCustomPropertyGrid
      :properties="objectProperties"
      :form-data="formData"
      @update="updateField"
    />
  </template>
</CnAdvancedFormDialog>
```

### Full form override

```vue
<CnAdvancedFormDialog :schema="schema" :item="item" @confirm="onConfirm" @close="close">
  <template #form="{ formData, updateField, jsonData, updateJson, isValidJson }">
    <MyCustomForm :data="formData" @update="updateField" />
    <MyJsonEditor :value="jsonData" :valid="isValidJson" @input="updateJson" />
  </template>
</CnAdvancedFormDialog>
```

---

## Comparison with CnFormDialog

| Feature | CnFormDialog | CnAdvancedFormDialog |
|--------|--------------|----------------------|
| Layout | Vertical form with one field per row | Tabs: Properties table, Metadata, JSON |
| Editing | Widgets (text, select, checkbox, etc.) | Click-to-edit in table + raw JSON |
| Size | Configurable (`size` prop) | Fixed `large` |
| Metadata | — | Optional tab (id, created, updated) |
| Best for | Simple create/edit forms | Complex objects, power users, JSON editing |

Both support the same two-phase confirm/result pattern and `setResult()`.
