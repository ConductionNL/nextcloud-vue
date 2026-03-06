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
- Optional integration with the generic object store (`useObjectStore`) for save/load

Use **CnFormDialog** when you need a simpler form with auto-generated fields and standard widgets (text, select, checkbox, etc.) without the table/JSON tabs.

---

## Overview

CnAdvancedFormDialog provides:

1. **Properties tab** — Table of all schema properties (and existing object keys). Click a row to edit the value inline. Supports `string`, `number`, `integer`, `boolean` with appropriate inputs; other types are read-only and shown as formatted/JSON. Rows can show validation state (valid/invalid/new/warning) when `validationDisplay="indicator"`.
2. **Metadata tab** — Read-only display of ID, Created, Updated (from `@self` or `id` / item). Shown by default only in edit mode; controllable via `showMetadataTab`.
3. **Data tab** — Full JSON editor (CodeMirror) synced with the form data. Invalid JSON blocks confirm. "Format JSON" button prettifies the content.

The dialog uses the same **two-phase pattern** as other CRUD dialogs: after the user confirms, you either handle `@confirm` (emit payload) or use **store integration** so the dialog itself calls `store.saveObject()` and then shows success/error via `setResult()`. In both cases you can call `setResult({ success: true })` or `setResult({ error: 'Message' })` to show the result phase and optional auto-close.

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `schema` | Object | `null` | JSON Schema used to derive property list, types, and labels (e.g. `schema.properties`, `schema.required`, `schema.title`) |
| `item` | Object | `null` | Existing object for edit mode; `null` for create mode |
| `dialogTitle` | String | `''` | Override dialog title; default is "Create {schemaTitle}" or "Edit {schemaTitle}" |
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
| `editablePropertyTypes` | Array | `null` | Schema types that are editable in the table; default `['string','number','integer','boolean']` |
| `validationDisplay` | String | `'indicator'` | `'indicator'` = show validation state on rows (valid/invalid/new/warning); `'none'` = no indicator |
| `store` | Object | `null` | Pinia store with `saveObject(objectType, payload)` (and optional `getError(objectType)`). When set with `objectType`, confirm uses store instead of emitting `confirm` |
| `objectType` | String | `''` | Object type key passed to `store.saveObject(objectType, payload)` when store integration is used |
| `beforeSave` | Function | `null` | `(payload) => payload` or async; called before save; return value is used as the payload sent to store or `@confirm` |
| `afterSave` | Function | `null` | `(saved) => void`; called after a successful store save, with the saved object |
| `jsonEditorDark` | Boolean | `false` | Use dark theme for the CodeMirror JSON editor |

---

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `formData` | Emitted when the user confirms and **store is not set**. Payload is the current form data (and may include `id` in edit mode). When store is set, the dialog handles save and uses `setResult()` instead. |
| `close` | — | Emitted when the dialog is closed (user clicks close/cancel or after result auto-close). |

---

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `#form` | formData, updateField, objectProperties, jsonData, updateJsonFromExternal, isValidJson | Replace the entire form content (all tabs). Use for fully custom UI while still using the dialog chrome and confirm/close flow. |
| `#register-schema-selection` | proceed | Optional step before the main tabs (e.g. choose register/schema). When this slot is provided, the main tabs are not shown until the consumer calls `proceed()`. |
| `#tab-properties` | formData, updateField, objectProperties, selectedProperty, handleRowClick, getPropertyDisplayName, getPropertyValidationClass, isPropertyEditable, validationDisplay | Override the Properties tab content. Default is the built-in properties table. |
| `#tab-metadata` | item, formData | Override the Metadata tab content. Default is a table with ID, Created, Updated. |
| `#tab-data` | jsonData, updateJsonFromExternal, isValid, formatJSON | Override the Data (JSON) tab content. Default is CodeMirror + "Format JSON" button. |
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
2. **Without store**: component emits `confirm` with the form payload; parent saves (e.g. via API) and then calls `this.$refs.advancedForm.setResult({ success: true })` or `setResult({ error: '...' })`.
3. **With store**: component calls `store.saveObject(objectType, payload)`; on success it calls `setResult({ success: true })`, on failure `setResult({ error: ... })` (using `store.getError(objectType)` if available).
4. Result phase shows success or error message; user can close or the dialog auto-closes after success.

---

## Store integration

Set `store` and `objectType` so that the dialog performs the save itself:

- On confirm, `beforeSave(payload)` is called if provided; its return value is used as the payload.
- Dialog calls `store.saveObject(objectType, payload)`.
- On success: `afterSave(saved)` is called (if provided), then `setResult({ success: true })`.
- On failure: `setResult({ error: message })` (message from `store.getError(objectType)` or a generic string).

Typical usage: `store` is the result of `useObjectStore()` (or `createObjectStore()`); `objectType` is the register/object type key used by that store.

---

## Properties table behavior

- **Editable types**: By default only `string`, `number`, `integer`, `boolean` are editable in the table; others are read-only and displayed as formatted values or JSON. Use `editablePropertyTypes` to restrict or extend.
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

### With store integration

```vue
<CnAdvancedFormDialog
  ref="advancedForm"
  :schema="schema"
  :item="editItem"
  :store="objectStore"
  object-type="myObjectType"
  :before-save="normalizePayload"
  :after-save="onSaved"
  @close="editItem = null"
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
  <template #form="{ formData, updateField, jsonData, updateJsonFromExternal, isValidJson }">
    <MyCustomForm :data="formData" @update="updateField" />
    <MyJsonEditor :value="jsonData" :valid="isValidJson" @input="updateJsonFromExternal" />
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
| Store integration | — | Optional `store` + `objectType` |
| Best for | Simple create/edit forms | Complex objects, power users, JSON editing |

Both support the same two-phase confirm/result pattern and `setResult()`.
