# Dialog System — Components Spec

## Purpose
Specifies the two-phase dialog pattern used by all 8 dialog components: CnDeleteDialog, CnCopyDialog, CnFormDialog, CnAdvancedFormDialog, CnMassDeleteDialog, CnMassCopyDialog, CnMassExportDialog, CnMassImportDialog.

---

## Requirements

### Requirement: REQ-DG-001 — Two-Phase Confirm-Then-Result Pattern

All dialog components MUST follow the two-phase confirm-then-result lifecycle. Phase 1 (confirm) shows a form or confirmation prompt. Phase 2 (result) shows success or error feedback. The dialog never performs the action itself — it emits an event and waits for the parent to call `setResult()` via a template ref.

#### Scenario: Confirm phase renders action prompt with confirm and cancel buttons

- GIVEN any dialog component is rendered (CnDeleteDialog, CnCopyDialog, CnFormDialog, CnAdvancedFormDialog, CnMassDeleteDialog, CnMassCopyDialog, CnMassExportDialog, or CnMassImportDialog)
- AND the internal `result` data property is `null`
- THEN the dialog MUST render its confirm-phase content (form, warning, or review list)
- AND a cancel button MUST be visible with the label from the `cancelLabel` prop (default: `"Cancel"`)
- AND a confirm button MUST be visible with the label from `confirmLabel` prop (or computed `resolvedConfirmLabel`)
- AND cancel MUST emit `@close` via `$emit('close')`
- AND the dialog MUST NOT close itself on confirm

#### Scenario: Confirm triggers loading state and emits confirm event

- GIVEN the dialog is in confirm phase (`result === null`)
- WHEN the user clicks the confirm button
- THEN the dialog MUST set `this.loading = true`
- AND the confirm button icon MUST switch to `NcLoadingIcon` (size 20)
- AND the dialog MUST emit `@confirm` with the dialog-specific payload
- AND `NcDialog` MUST receive `:can-close="!loading"` to prevent dismissal during the operation
- AND the dialog MUST NOT close itself — the parent controls the lifecycle via `setResult()`

#### Scenario: Result phase shows success and auto-closes after 2000ms

- GIVEN the parent calls `dialogRef.setResult({ success: true })` on the dialog ref
- THEN the dialog MUST set `this.loading = false` and `this.result = resultData`
- AND an `NcNoteCard` with `type="success"` MUST render showing the `successText` prop value
- AND the confirm button MUST be hidden (`v-if="result === null"`)
- AND the cancel button label MUST switch to `closeLabel` (default: `"Close"`)
- AND the dialog MUST call `setTimeout(() => this.$emit('close'), 2000)` to auto-close
- AND the timeout handle MUST be stored in `this.closeTimeout` for cleanup in `beforeDestroy`

#### Scenario: Result phase shows error without auto-closing

- GIVEN the parent calls `dialogRef.setResult({ error: 'Network timeout' })`
- THEN the dialog MUST set `this.loading = false` and `this.result = resultData`
- AND an `NcNoteCard` with `type="error"` MUST render showing the error message string
- AND the dialog MUST NOT auto-close — the user MUST dismiss it manually via the close button
- AND the close button label MUST show `closeLabel` (default: `"Close"`)

#### Scenario: Timeout is cleaned up on destroy to prevent memory leaks

- GIVEN a dialog has triggered a success auto-close timeout
- WHEN the dialog is destroyed before the timeout fires (e.g., parent removes it from DOM)
- THEN the `beforeDestroy` hook MUST call `clearTimeout(this.closeTimeout)` to prevent stale emissions

---

### Requirement: REQ-DG-002 — setResult Ref Pattern

All dialogs MUST expose a public `setResult(resultData)` method that the parent calls via a template ref. This is the sole mechanism for transitioning from confirm phase to result phase. CnFormDialog additionally MUST expose `setValidationErrors(fieldErrors)`.

#### Scenario: Parent calls setResult via template ref after API success

- GIVEN a CnDeleteDialog is rendered with `ref="deleteDialog"`
- AND the parent receives `@confirm` with item ID and performs a successful API call
- WHEN the parent calls `this.$refs.deleteDialog.setResult({ success: true })`
- THEN the dialog MUST transition to result phase showing success NcNoteCard
- AND the dialog MUST auto-close after 2000ms

#### Scenario: Parent calls setResult via template ref after API error

- GIVEN a CnCopyDialog is rendered with `ref="copyDialog"`
- AND the parent receives `@confirm` and the API call fails
- WHEN the parent calls `this.$refs.copyDialog.setResult({ error: 'Item not found' })`
- THEN the dialog MUST transition to result phase showing the error message
- AND the dialog MUST NOT auto-close

#### Scenario: CnFormDialog setValidationErrors sets per-field errors without transitioning to result phase

- GIVEN a CnFormDialog is rendered with `ref="formDialog"`
- AND the parent receives `@confirm` and the API returns validation errors
- WHEN the parent calls `this.$refs.formDialog.setValidationErrors({ title: 'Already exists', slug: 'Must be unique' })`
- THEN the dialog MUST set `this.loading = false`
- AND the dialog MUST merge the errors into `this.errors` (using `{ ...this.errors, ...fieldErrors }`)
- AND the dialog MUST remain in confirm phase (NOT transition to result phase)
- AND the `title` field MUST show `"Already exists"` as helper text with error styling
- AND the `slug` field MUST show `"Must be unique"` as helper text with error styling

#### Scenario: CnIndexPage exposes named forwarding methods for all dialog refs

- GIVEN a CnIndexPage is rendered with `ref="indexPage"`
- THEN the following public methods MUST be available on the CnIndexPage ref:
  - `setFormResult(resultData)` — forwards to `this.$refs.formDialog.setResult(resultData)`
  - `setSingleDeleteResult(resultData)` — forwards to `this.$refs.singleDeleteDialog.setResult(resultData)`
  - `setSingleCopyResult(resultData)` — forwards to `this.$refs.singleCopyDialog.setResult(resultData)`
  - `setMassDeleteResult(resultData)` — forwards to `this.$refs.massDeleteDialog.setResult(resultData)`
  - `setMassCopyResult(resultData)` — forwards to `this.$refs.massCopyDialog.setResult(resultData)`
  - `setExportResult(resultData)` — forwards to `this.$refs.exportDialog.setResult(resultData)`
  - `setImportResult(resultData)` — forwards to `this.$refs.importDialog.setResult(resultData)`
  - `openFormDialog(item)` — programmatically opens the form dialog (null = create, object = edit)

---

### Requirement: REQ-DG-003 — CnDeleteDialog — Single-Item Delete Confirmation

CnDeleteDialog MUST render a warning message with `{name}` placeholder substitution and a destructive confirm button. It MUST emit `@confirm` with the item's `id`.

#### Scenario: Delete warning text resolves the {name} placeholder from the item

- GIVEN `item = { id: '123', title: 'Report Q1' }` and `nameField = "title"`
- WHEN CnDeleteDialog renders
- THEN the `resolvedWarningText` computed MUST replace `{name}` in `warningText` with `"Report Q1"`
- AND the default warning MUST read: `Are you sure you want to permanently delete "Report Q1"? This action cannot be undone.`
- AND the warning MUST render inside an `NcNoteCard` with `type="warning"`

#### Scenario: Name resolution falls back through a defined chain

- GIVEN `nameField = "label"` and `item = { id: 'abc', title: 'Foo' }` (no `label` property)
- THEN `itemName` MUST be resolved by the chain: `item[nameField]` -> `item.name` -> `item.title` -> `item.id`
- AND in this case, `itemName` MUST be `"Foo"` (from `item.title`)

#### Scenario: Confirm button uses destructive error styling with trash icon

- GIVEN the dialog is in confirm phase
- THEN the confirm button MUST have `type="error"` (red destructive styling)
- AND the confirm button icon MUST be `TrashCanOutline` (from `vue-material-design-icons`)
- AND the confirm button label MUST use `confirmLabel` prop (default: `"Delete"`)

#### Scenario: Confirm emits item ID as payload

- GIVEN `item = { id: '456', title: 'Draft' }`
- WHEN the user clicks the confirm button
- THEN `@confirm` MUST emit `'456'` (the item's `id` property)
- AND `this.loading` MUST be set to `true`

#### Scenario: Dialog size is small

- GIVEN a CnDeleteDialog is rendered
- THEN `NcDialog` MUST receive `size="small"`

---

### Requirement: REQ-DG-004 — CnCopyDialog — Single-Item Copy with Naming Pattern

CnCopyDialog MUST offer three naming patterns and show a real-time preview of the new name. It MUST emit `@confirm` with `{ id, newName }`.

#### Scenario: Naming pattern selector offers three options with default

- GIVEN an item with name `"Report Q1"`
- WHEN CnCopyDialog renders
- THEN an `NcSelect` MUST render with `patternOptions` containing:
  - `{ id: 'copy-of', label: 'Copy of {name}' }` (default selected)
  - `{ id: 'name-copy', label: '{name} - Copy' }`
  - `{ id: 'name-parens', label: '{name} (Copy)' }`
- AND the NcSelect MUST have `:clearable="false"` (a pattern must always be selected)

#### Scenario: Real-time preview shows original and new name

- GIVEN `item = { title: 'Budget 2025' }` and selected pattern is `"copy-of"`
- THEN the preview row MUST show: `"Budget 2025"` -> `"Copy of Budget 2025"`
- AND the original name MUST have class `cn-copy__preview-original` (muted text)
- AND the new name MUST have class `cn-copy__preview-new` (bold text)
- AND an arrow separator (`&rarr;`) MUST appear between them

#### Scenario: Pattern change updates the preview immediately

- GIVEN the current pattern is `"copy-of"` and item name is `"Report"`
- WHEN the user selects `"name-parens"` from the NcSelect
- THEN the preview MUST update to show `"Report"` -> `"Report (Copy)"`

#### Scenario: Confirm emits id and newName based on selected pattern

- GIVEN `item = { id: '789', title: 'Invoice' }` and selected pattern is `"name-copy"`
- WHEN the user clicks confirm
- THEN `@confirm` MUST emit `{ id: '789', newName: 'Invoice - Copy' }`

#### Scenario: Confirm button uses primary styling with copy icon

- GIVEN the dialog is in confirm phase
- THEN the confirm button MUST have `type="primary"`
- AND the confirm button icon MUST be `ContentCopy` (from `vue-material-design-icons`)

---

### Requirement: REQ-DG-005 — CnFormDialog — Schema-Driven Create/Edit Form

CnFormDialog MUST auto-generate form fields from a JSON Schema using `fieldsFromSchema()`. It MUST support create mode (item=null) and edit mode (item provided). It MUST validate client-side before emitting `@confirm` with the form data.

#### Scenario: Create mode initializes empty form with field defaults

- GIVEN `item = null` and a `schema` with properties `{ title: { type: 'string' }, active: { type: 'boolean', default: true }, tags: { type: 'array', items: { type: 'string' } } }`
- WHEN CnFormDialog renders
- THEN `isCreateMode` MUST be `true`
- AND `resolvedTitle` MUST be `"Create {schema.title}"` (e.g., `"Create Contact"`)
- AND `resolvedConfirmLabel` MUST be `"Create"`
- AND `formData` MUST be initialized: `{ title: null, active: true, tags: [] }`
- AND the confirm button icon MUST be `Plus`

#### Scenario: Edit mode populates form from existing item

- GIVEN `item = { id: '123', title: 'Foo', status: 'active' }` and a schema
- WHEN CnFormDialog renders
- THEN `isCreateMode` MUST be `false`
- AND `resolvedTitle` MUST be `"Edit {schema.title}"`
- AND `resolvedConfirmLabel` MUST be `"Save"`
- AND `formData` MUST be a deep clone of the item (via `JSON.parse(JSON.stringify(item))`)
- AND the confirm button icon MUST be `ContentSaveOutline`

#### Scenario: Widget rendering maps schema types to UI components

- GIVEN a schema with various property types
- THEN the following widget mappings MUST apply (via `resolveWidget()` in `fieldsFromSchema()`):
  - `type: 'string'` with no format/enum -> `widget: 'text'` -> `NcTextField` with `type="text"`
  - `type: 'string'` with `format: 'email'` -> `widget: 'email'` -> `NcTextField` with `type="email"`
  - `type: 'string'` with `format: 'uri'` -> `widget: 'url'` -> `NcTextField` with `type="url"`
  - `type: 'string'` with `enum` -> `widget: 'select'` -> `NcSelect` with enum options
  - `type: 'string'` with `format: 'date'` -> `widget: 'date'` -> `NcTextField` with `type="date"`
  - `type: 'string'` with `format: 'date-time'` -> `widget: 'datetime'` -> `NcTextField` with `type="datetime-local"`
  - `type: 'string'` with `maxLength > 255` or `format: 'textarea'` -> `widget: 'textarea'` -> native `<textarea>`
  - `type: 'number'` or `type: 'integer'` -> `widget: 'number'` -> `NcTextField` with `type="number"`
  - `type: 'boolean'` -> `widget: 'checkbox'` -> `NcCheckboxRadioSwitch` with `type="switch"`
  - `type: 'array'` with `items.enum` -> `widget: 'multiselect'` -> `NcSelect` with `:multiple="true"`
  - `type: 'array'` without `items.enum` -> `widget: 'tags'` -> `NcSelect` with `:multiple="true"` and `:taggable="true"`

#### Scenario: Field labels show required indicator and helper text

- GIVEN a field with `label: 'Title'`, `required: true`, `description: 'Enter a title'`
- THEN the label MUST render as `"Title *"` (with asterisk for required)
- AND when there is no error, helper text MUST show `"Enter a title"` (the field description)
- AND when there is an error (e.g., `errors.title = 'Title is required.'`), helper text MUST show the error with `error` styling

#### Scenario: Number fields convert string input to Number type

- GIVEN a field with `widget: 'number'`
- WHEN the user enters `"42"` in the NcTextField
- THEN `updateField` MUST be called with `Number("42")` -> `42`
- AND when the user clears the field (empty string), `updateField` MUST be called with `null`

---

### Requirement: REQ-DG-006 — CnFormDialog Client-Side Validation

CnFormDialog MUST run client-side validation on all resolved fields before emitting `@confirm`. Validation MUST check required, minLength, maxLength, pattern, minimum, and maximum constraints from the field's `validation` object.

#### Scenario: Required field validation prevents submission when empty

- GIVEN a field `{ key: 'title', label: 'Title', required: true }`
- AND `formData.title` is `null`, `undefined`, `''`, or (for arrays) `[]`
- WHEN the user clicks confirm
- THEN `validate()` MUST set `errors.title = 'Title is required.'`
- AND `validate()` MUST return `false`
- AND `executeConfirm()` MUST NOT emit `@confirm`
- AND `this.loading` MUST remain `false`

#### Scenario: String length validation enforces minLength and maxLength

- GIVEN a field with `validation: { minLength: 3, maxLength: 50 }`
- AND `formData.name = 'AB'` (2 characters)
- WHEN the user clicks confirm
- THEN `errors.name` MUST be `'Minimum 3 characters.'`
- AND for `formData.name = 'A'.repeat(51)`, `errors.name` MUST be `'Maximum 50 characters.'`

#### Scenario: Pattern validation uses RegExp test

- GIVEN a field with `validation: { pattern: '^[a-z-]+$' }`
- AND `formData.slug = 'My Slug!'` (contains uppercase and special chars)
- WHEN the user clicks confirm
- THEN `errors.slug` MUST be `'Invalid format.'`
- AND if the pattern is an invalid regex, the error MUST be silently skipped (try/catch)

#### Scenario: Number range validation enforces minimum and maximum

- GIVEN a field with `widget: 'number'` and `validation: { minimum: 0, maximum: 100 }`
- AND `formData.score = -5`
- WHEN the user clicks confirm
- THEN `errors.score` MUST be `'Minimum value is 0.'`
- AND for `formData.score = 150`, `errors.score` MUST be `'Maximum value is 100.'`

#### Scenario: Editing a field clears its error immediately

- GIVEN `errors.title = 'Title is required.'`
- WHEN `updateField('title', 'New Title')` is called
- THEN `this.$set(this.formData, 'title', 'New Title')` MUST be called
- AND `this.$delete(this.errors, 'title')` MUST be called to clear the error

---

### Requirement: REQ-DG-007 — CnFormDialog Slot Overrides at Three Levels

CnFormDialog MUST support three levels of slot-based customization: full form replacement, per-field replacement, and content injection before/after fields.

#### Scenario: #form slot replaces the entire auto-generated form

- GIVEN `#form` scoped slot is provided by the parent
- THEN the entire auto-generated field list MUST be replaced with the slot content
- AND the slot MUST receive scope: `{ fields: resolvedFields, formData, errors, updateField }`
- AND the parent can render completely custom form content using these scope props

#### Scenario: #field-{key} slot replaces a single auto-generated field

- GIVEN `#field-status` scoped slot is provided
- THEN only the `status` field MUST be replaced; all other fields render normally
- AND the slot MUST receive scope: `{ field, value: formData[field.key], error: errors[field.key], updateField }`
- AND the parent MUST call `updateField(field.key, newValue)` to update the form data

#### Scenario: #before-fields and #after-fields inject content around auto-generated fields

- GIVEN `#before-fields` and/or `#after-fields` slots are provided
- THEN `#before-fields` content MUST render before the first auto-generated field
- AND `#after-fields` content MUST render after the last auto-generated field
- AND the auto-generated fields MUST render normally between them

#### Scenario: #form-fields slot in CnIndexPage passes through to CnFormDialog

- GIVEN a CnIndexPage renders with a `#form-fields` slot
- THEN the slot content MUST be passed through to the built-in CnFormDialog's `#form` slot
- AND the slot scope `{ fields, formData, errors, updateField }` MUST be forwarded
- AND this is the standard pattern for consumer apps (e.g., OpenRegister's RegistersIndex uses `#form-fields` to render custom NcTextField and NcSelect fields)

#### Scenario: Field filtering via excludeFields, includeFields, and fieldOverrides props

- GIVEN `excludeFields = ['id', 'created']` and `schema` has properties `id`, `title`, `created`, `status`
- THEN `resolvedFields` MUST contain only `title` and `status` (excluded fields are filtered out)
- AND when `includeFields = ['title']`, only `title` MUST appear (whitelist mode)
- AND `fieldOverrides = { title: { label: 'Name', required: true } }` MUST merge overrides into the field definition via `Object.assign(field, overrides[key])`

---

### Requirement: REQ-DG-008 — CnAdvancedFormDialog — Tabbed Create/Edit with Properties Table and JSON Editor

CnAdvancedFormDialog MUST provide a richer editing experience with a tabbed interface: Properties tab (click-to-edit table), optional Metadata tab, and Data tab (CodeMirror JSON editor). It MUST use Bootstrap-Vue `BTabs`/`BTab` and be fixed to `size="large"`.

#### Scenario: Properties tab renders a click-to-edit table via CnPropertiesTab

- GIVEN `showPropertiesTable = true` (default)
- THEN the first tab MUST be labeled `"Properties"`
- AND it MUST render a `CnPropertiesTab` sub-component showing all schema properties as rows
- AND clicking a row MUST make it editable inline (for supported types: string, number, integer, boolean)
- AND property value changes MUST call `onPropertyValueUpdate({ key, value })` which calls `this.$set(this.formData, key, value)`

#### Scenario: Data (JSON) tab provides raw JSON editing via CodeMirror

- GIVEN `showJsonTab = true` (default)
- THEN a tab labeled `"Data"` MUST render containing a `CnDataTab` sub-component
- AND the JSON editor MUST show `this.jsonData` (initialized as `JSON.stringify(formData, null, 2)`)
- AND editing JSON MUST update `this.jsonData`, and if valid JSON, MUST sync to `this.formData` via `updateFormFromJson()`
- AND editing properties MUST sync to `this.jsonData` via `updateJsonFromForm()`
- AND an `isInternalUpdate` flag MUST prevent infinite update loops between the two sync directions

#### Scenario: Metadata tab visibility depends on edit mode by default

- GIVEN `showMetadataTab = null` (default)
- THEN `resolvedShowMetadataTab` MUST be `true` when `item` is provided (edit mode) and `false` when `item` is null (create mode)
- AND when visible, the tab MUST render a `CnMetadataTab` sub-component showing read-only item metadata

#### Scenario: Confirm validates JSON before emitting when Data tab is active

- GIVEN the Data tab is active (`this.activeTab === this.dataTabIndex`)
- AND the JSON editor contains invalid JSON (e.g., `"{ title: }"`)
- WHEN the user clicks confirm
- THEN `executeConfirm()` MUST check `this.isValidJson(this.jsonData)` and return early if false
- AND `@confirm` MUST NOT be emitted
- AND no error message is shown (the CodeMirror editor provides its own syntax highlighting)

#### Scenario: Tab slots allow replacing tab content while keeping the tab structure

- GIVEN `#tab-properties` scoped slot is provided
- THEN the Properties tab content MUST be replaced with the slot content
- AND the slot MUST receive scope: `{ formData, updateField, objectProperties, selectedProperty, handleRowClick, getPropertyDisplayName, getPropertyValidationClass, isPropertyEditable, validationDisplay }`
- AND similarly, `#tab-metadata` receives `{ item, formData }` and `#tab-data` receives `{ jsonData, updateJson, isValid, formatJson }`

#### Scenario: Actions bar supports left and right extension slots

- GIVEN `#actions-left` or `#actions-right` slots are provided
- THEN `#actions-left` content MUST render before the Cancel button in the dialog footer
- AND `#actions-right` content MUST render after the Confirm button
- AND CnFormDialog does NOT have these slots (only CnAdvancedFormDialog does)

---

### Requirement: REQ-DG-009 — CnMassDeleteDialog — Bulk Delete with Item Removal

CnMassDeleteDialog MUST show a list of items to delete with the ability to remove individual items before confirming. It MUST emit `@confirm` with an array of IDs.

#### Scenario: Review phase lists all items with remove buttons

- GIVEN `items = [{ id: '1', title: 'A' }, { id: '2', title: 'B' }, { id: '3', title: 'C' }]`
- WHEN CnMassDeleteDialog renders
- THEN all 3 items MUST be listed showing their names (via `getItemName()` fallback chain)
- AND each item row MUST have a remove button (tertiary NcButton with Close icon)
- AND an `NcNoteCard` with `type="warning"` MUST show the `warningText` prop above the list
- AND the item list MUST have `max-height: 300px` with `overflow-y: auto` for scrolling

#### Scenario: Removing items from the list before confirming

- GIVEN 5 items are shown in the list
- WHEN the user clicks the remove button on item `id: '3'`
- THEN `localItems` MUST be filtered to exclude `id: '3'`
- AND only 4 items MUST remain in the list
- AND the confirm button MUST remain enabled (still items to delete)

#### Scenario: Confirm button is disabled when all items are removed

- GIVEN the user has removed all items from the list (`localItems.length === 0`)
- THEN the confirm button MUST be disabled (`:disabled="loading || localItems.length === 0"`)
- AND an empty message MUST show: `emptyText` (default: `"No items selected for deletion."`)

#### Scenario: Confirm emits array of remaining item IDs

- GIVEN `localItems` contains items with IDs `['1', '4', '5']` (after user removed some)
- WHEN the user clicks confirm
- THEN `@confirm` MUST emit `['1', '4', '5']` (array of IDs from remaining localItems)

#### Scenario: Confirm button uses destructive error styling like CnDeleteDialog

- GIVEN the dialog is in confirm phase
- THEN the confirm button MUST have `type="error"` with `TrashCanOutline` icon
- AND the dialog size MUST be `"normal"` (larger than single-delete's `"small"`)

---

### Requirement: REQ-DG-010 — CnMassCopyDialog — Bulk Copy with Naming Patterns and Preview

CnMassCopyDialog MUST show all selected items with their current and new names based on the selected naming pattern, with per-item removal. It MUST emit `@confirm` with `{ ids, getName }` where `getName` is a function.

#### Scenario: All items show original-to-new name preview

- GIVEN `items = [{ id: '1', title: 'Report' }, { id: '2', title: 'Budget' }]`
- AND the selected pattern is `"copy-of"` (default)
- THEN each item row MUST show: `"Report"` -> `"Copy of Report"` and `"Budget"` -> `"Copy of Budget"`
- AND the same three pattern options MUST be available as in CnCopyDialog

#### Scenario: Pattern change updates all item previews simultaneously

- GIVEN 3 items are listed with pattern `"copy-of"`
- WHEN the user selects `"name-parens"` from the NcSelect
- THEN all 3 item previews MUST update to show `"{name} (Copy)"` pattern results

#### Scenario: Confirm emits ids array and getName function

- GIVEN `localItems` has items `[{ id: '1', title: 'A' }, { id: '2', title: 'B' }]` and pattern is `"name-copy"`
- WHEN the user clicks confirm
- THEN `@confirm` MUST emit `{ ids: ['1', '2'], getName: Function }`
- AND calling `getName({ title: 'A' })` MUST return `"A - Copy"`
- AND the `getName` function MUST capture the current `patternId` in a closure

#### Scenario: Items can be removed before confirming, like CnMassDeleteDialog

- GIVEN 4 items in the list
- WHEN the user removes 2 items
- THEN only 2 items MUST remain in the list and in the confirm payload
- AND the confirm button MUST be disabled when `localItems.length === 0`

---

### Requirement: REQ-DG-011 — CnMassExportDialog — Format Selection for Bulk Export

CnMassExportDialog MUST provide a format selector with configurable options and an optional description. It MUST emit `@confirm` with `{ format }`.

#### Scenario: Format selector shows available formats with default selection

- GIVEN `formats` prop is `[{ id: 'excel', label: 'Excel (.xlsx)' }, { id: 'csv', label: 'CSV (.csv)' }]` (default)
- AND `defaultFormat = 'excel'` (default)
- THEN the NcSelect MUST show `"Excel (.xlsx)"` as selected
- AND the NcSelect MUST have `:clearable="false"` (a format must always be selected)

#### Scenario: Custom formats can be provided via the formats prop

- GIVEN `formats = [{ id: 'json', label: 'JSON' }, { id: 'xml', label: 'XML' }, { id: 'pdf', label: 'PDF' }]`
- AND `defaultFormat = 'json'`
- THEN the NcSelect MUST show `"JSON"` as selected with all three options available

#### Scenario: Optional description text shows above the format selector

- GIVEN `description = 'Export 42 objects from Cases register'`
- THEN a paragraph with class `cn-mass-export__description` MUST render above the format field
- AND when `description` is empty string (default), the paragraph MUST NOT render (`v-if="description"`)

#### Scenario: Confirm emits the selected format ID

- GIVEN the user has selected `{ id: 'csv', label: 'CSV (.csv)' }`
- WHEN the user clicks confirm
- THEN `@confirm` MUST emit `{ format: 'csv' }`

#### Scenario: Dialog uses small size and Export icon

- GIVEN CnMassExportDialog renders
- THEN `NcDialog` MUST receive `size="small"`
- AND the confirm button MUST use `type="primary"` with `ExportIcon` (from `vue-material-design-icons/Export`)

---

### Requirement: REQ-DG-012 — CnMassImportDialog — File Upload with Options and Results Summary

CnMassImportDialog MUST handle file upload, configurable import options (toggle switches), and display a detailed results summary table with per-sheet statistics and expandable error details. It MUST emit `@confirm` with `{ file, options }`.

#### Scenario: File upload via hidden input and button trigger

- GIVEN the dialog is in form phase
- THEN a hidden `<input type="file">` MUST exist with `ref="fileInput"` and `:accept="acceptedTypes"` (default: `".json,.xlsx,.xls,.csv"`)
- AND an NcButton with `Upload` icon MUST trigger `$refs.fileInput.click()`
- AND when a file is selected, `selectedFile` MUST be set and the file name and formatted size MUST display

#### Scenario: Confirm button requires a file to be selected

- GIVEN `selectedFile` is `null`
- THEN the confirm button MUST be disabled (`:disabled="loading || !selectedFile || !canSubmit"`)
- AND the `canSubmit` prop (default: `true`) allows the parent to add additional submission conditions

#### Scenario: Import options render as toggle switches

- GIVEN `options = [{ key: 'validation', label: 'Enable validation', description: 'Validate against schema', default: true }]`
- THEN an `NcCheckboxRadioSwitch` with `type="switch"` MUST render for each option
- AND the switch MUST be initialized to `opt.default` (or `false` if not specified)
- AND toggling MUST call `setOption(key, value)` which uses `this.$set(this.optionValues, key, value)`

#### Scenario: Confirm emits file and options object

- GIVEN `selectedFile` is a `File` object and `optionValues = { validation: true, publish: false }`
- WHEN the user clicks confirm
- THEN `@confirm` MUST emit `{ file: File, options: { validation: true, publish: false } }`

#### Scenario: Results summary table shows per-sheet statistics with expandable errors

- GIVEN the parent calls `setResult({ success: true, summary: { 'Contacts': { found: 50, created: 30, updated: 15, unchanged: 3, errors: [{ row: 12, type: 'validation', error: 'Missing email' }] } } })`
- THEN a summary table MUST render with columns: Sheet, Found, Created, Updated, Unchanged, Errors
- AND the `"Contacts"` row MUST show: 50, 30, 15, 3, 1
- AND the errors count MUST have an expand button (ChevronDown icon)
- AND clicking the expand button MUST toggle `expandedErrors['Contacts']` showing a nested error table with columns: Row, Type, Message
- AND the error row MUST show: `12`, `validation`, `Missing email`

#### Scenario: Import dialog does NOT auto-close on success (unlike other dialogs)

- GIVEN the parent calls `setResult({ success: true, summary: {...} })`
- THEN the success NcNoteCard MUST render
- BUT the dialog MUST NOT auto-close (no `setTimeout` in `setResult`) because the user needs time to review the summary table
- AND when `hasErrors` is true (any sheet has errors), an NcNoteCard with `type="warning"` MUST show `partialSuccessText`

#### Scenario: #fields slot allows adding extra form controls

- GIVEN `#fields` scoped slot is provided
- THEN the slot content MUST render between the file upload row and the file type help section
- AND the slot MUST receive scope: `{ file: selectedFile }`
- AND this is used by consumer apps to add register/schema selectors that depend on the selected file

---

### Requirement: REQ-DG-013 — Dialog Open/Close Lifecycle via CnIndexPage

CnIndexPage MUST manage dialog visibility through data properties and route single-object actions (edit, copy, delete) from CnRowActions and mass actions from CnMassActionBar to the appropriate dialog components.

#### Scenario: Row action "Edit" opens CnFormDialog in edit mode

- GIVEN a CnIndexPage with `showFormDialog = true`
- WHEN a row action `{ id: 'edit' }` is triggered for an item
- THEN `actionTargetItem` MUST be set to the clicked item
- AND `showFormDialogVisible` MUST be set to `true`
- AND CnFormDialog MUST receive `:item="actionTargetItem"` (non-null = edit mode)

#### Scenario: Add button opens CnFormDialog in create mode

- GIVEN a CnIndexPage with `showFormDialog = true`
- WHEN the user clicks the Add button in CnActionsBar
- THEN `actionTargetItem` MUST be set to `null`
- AND `showFormDialogVisible` MUST be set to `true`
- AND CnFormDialog MUST receive `:item="null"` (null = create mode)

#### Scenario: useAdvancedFormDialog prop switches between CnFormDialog and CnAdvancedFormDialog

- GIVEN `useAdvancedFormDialog = true` on CnIndexPage
- THEN when the form dialog opens, `CnAdvancedFormDialog` MUST render (instead of `CnFormDialog`)
- AND both are gated by `v-if="showFormDialogVisible"` but only one is active based on `useAdvancedFormDialog`
- AND the ref name MUST be `"formDialog"` for both (so `setFormResult` works with either)

#### Scenario: Mass action triggers open the corresponding mass dialog

- GIVEN selected items exist and CnMassActionBar emits action events
- THEN `@show-delete` MUST set `showMassDeleteDialog = true` (renders CnMassDeleteDialog)
- AND `@show-copy` MUST set `showMassCopyDialog = true` (renders CnMassCopyDialog)
- AND `@show-export` MUST set `showExportDialog = true` (renders CnMassExportDialog)
- AND `@show-import` MUST set `showImportDialog = true` (renders CnMassImportDialog)
- AND mass dialogs receive `:items="selectedObjects"` (full objects for selected IDs)

#### Scenario: Dialog close resets visibility and target item

- GIVEN a single-object dialog is visible (e.g., `showSingleDeleteDialog = true`)
- WHEN the dialog emits `@close`
- THEN `showSingleDeleteDialog` MUST be set to `false`
- AND `actionTargetItem` MUST be reset
- AND the dialog MUST be removed from the DOM (via `v-if`)

---

### Requirement: REQ-DG-014 — i18n of Dialog Labels via Props

All dialog components accept pre-translated strings via props with English defaults. Components MUST NOT import `t()` from any specific app. Consumer apps pass translated strings at the call site.

#### Scenario: All common label props have English defaults

- GIVEN any dialog component
- THEN the following props MUST exist with these defaults:
  - `cancelLabel: 'Cancel'`
  - `closeLabel: 'Close'`
  - `confirmLabel: 'Delete' | 'Copy' | 'Create'/'Save' | 'Export' | 'Import'` (varies by dialog)
  - `successText` with a sensible English default (e.g., `'Item successfully deleted.'`)
  - `dialogTitle` with a sensible English default (e.g., `'Delete Item'`)

#### Scenario: Consumer app passes translated labels

- GIVEN a Dutch-language consumer app using OpenRegister
- THEN the app MUST pass translated props:
  ```html
  <CnDeleteDialog
    :dialog-title="t('openregister', 'Item verwijderen')"
    :warning-text="t('openregister', 'Weet u zeker dat u \"{name}\" permanent wilt verwijderen?')"
    :cancel-label="t('openregister', 'Annuleren')"
    :close-label="t('openregister', 'Sluiten')"
    :confirm-label="t('openregister', 'Verwijderen')"
    :success-text="t('openregister', 'Item succesvol verwijderd.')" />
  ```

#### Scenario: CnMassImportDialog has the most label props for full i18n coverage

- GIVEN CnMassImportDialog
- THEN the following additional label props MUST exist beyond the common set:
  - `sheetLabel: 'Sheet'`, `foundLabel: 'Found'`, `createdLabel: 'Created'`
  - `updatedLabel: 'Updated'`, `unchangedLabel: 'Unchanged'`, `errorsLabel: 'Errors'`
  - `summaryTitle: 'Import Summary'`, `supportedFormatsLabel: 'Supported file types:'`
  - `selectFileLabel: 'Select File'`, `loadingText: 'Importing data...'`
  - `partialSuccessText: 'Import completed with errors...'`

---

### Requirement: REQ-DG-015 — Accessibility: Focus Trap, ARIA, and Dismissal Prevention During Loading

All dialogs MUST use NcDialog as their shell, which provides focus trapping and ARIA attributes. Dialogs MUST prevent dismissal while loading to avoid interrupting in-progress operations.

#### Scenario: NcDialog provides focus trap and dialog role

- GIVEN any Cn dialog component renders
- THEN the underlying `NcDialog` component MUST provide:
  - `role="dialog"` on the dialog container
  - Focus trapping within the dialog while open (inherited from NcDialog)
  - Focus return to the trigger element when the dialog closes (inherited from NcDialog)

#### Scenario: Dialog cannot be closed while loading

- GIVEN `this.loading = true` (confirm has been clicked, waiting for setResult)
- THEN `NcDialog` MUST receive `:can-close="false"` (the `!loading` expression)
- AND the NcDialog close button (X) MUST be disabled
- AND clicking the backdrop MUST NOT close the dialog
- AND pressing Escape MUST NOT close the dialog

#### Scenario: Mass action dialogs have accessible remove buttons

- GIVEN CnMassDeleteDialog or CnMassCopyDialog shows a list of items
- THEN each remove button MUST have `:aria-label="removeLabel"` (default: `"Remove from list"`)
- AND the remove button MUST be `type="tertiary"` with a `Close` icon

#### Scenario: Form fields use associated labels and IDs

- GIVEN CnFormDialog renders a textarea or select field
- THEN the `<label>` MUST have `:for="'cn-form-' + field.key"` matching the field's `:id="'cn-form-' + field.key"`
- AND NcTextField components MUST receive `:label` prop which renders an associated label internally
- AND NcCheckboxRadioSwitch MUST have its label text as slot content

---

## Current Implementation Status

**All 8 dialog components exist and are implemented:**

- **CnDeleteDialog** — `src/components/CnDeleteDialog/CnDeleteDialog.vue` (171 lines). Two-phase pattern with NcNoteCard warning, `{name}` placeholder substitution, name fallback chain, `type="error"` confirm button with TrashCanOutline icon, `size="small"`.

- **CnCopyDialog** — `src/components/CnCopyDialog/CnCopyDialog.vue` (251 lines). Two-phase pattern with NcSelect pattern selector (3 options), real-time preview row, `type="primary"` confirm button with ContentCopy icon, `size="small"`.

- **CnFormDialog** — `src/components/CnFormDialog/CnFormDialog.vue` (629 lines). Schema-driven create/edit with `fieldsFromSchema()`. Supports 11 widget types (text, email, url, number, date, datetime, textarea, select, multiselect, tags, checkbox). Client-side validation (required, minLength, maxLength, pattern, minimum, maximum). Server-side validation via `setValidationErrors()`. Three-level slot overrides (`#form`, `#field-{key}`, `#before-fields`/`#after-fields`). Configurable size via `size` prop (default: `"normal"`).

- **CnAdvancedFormDialog** — `src/components/CnAdvancedFormDialog/CnAdvancedFormDialog.vue` (542 lines). Tabbed interface with Bootstrap-Vue BTabs: Properties tab (CnPropertiesTab click-to-edit table), optional Metadata tab (CnMetadataTab), Data tab (CnDataTab CodeMirror JSON editor). Bidirectional sync between properties and JSON with `isInternalUpdate` loop guard. Fixed `size="large"`. Tab-level slot overrides (`#tab-properties`, `#tab-metadata`, `#tab-data`). Action bar extension slots (`#actions-left`, `#actions-right`). Optional `#register-schema-selection` slot for multi-step flows.

- **CnMassDeleteDialog** — `src/components/CnMassDeleteDialog/CnMassDeleteDialog.vue` (239 lines). Review phase with item list, per-item remove buttons, empty state message, `type="error"` confirm button, `size="normal"`. Emits array of IDs.

- **CnMassCopyDialog** — `src/components/CnMassCopyDialog/CnMassCopyDialog.vue` (321 lines). Review phase with naming pattern selector and per-item preview. Emits `{ ids, getName }` where `getName` is a closure capturing the selected pattern. Per-item remove buttons. `size="normal"`.

- **CnMassExportDialog** — `src/components/CnMassExportDialog/CnMassExportDialog.vue` (191 lines). Format selector with configurable `formats` array, optional `description` text, `size="small"`. Emits `{ format }`.

- **CnMassImportDialog** — `src/components/CnMassImportDialog/CnMassImportDialog.vue` (492 lines). File upload with hidden input, configurable import options (NcCheckboxRadioSwitch toggles), file type help section, `#fields` slot for extra controls. Results summary table with per-sheet statistics (found/created/updated/unchanged/errors) and expandable error details. Does NOT auto-close on success (unlike other dialogs). `size="large"`. `canSubmit` prop for parent-controlled submission gating.

**Two-phase pattern — verified across all dialogs:**
- All 8 dialogs use `this.loading` + `NcLoadingIcon` + `:can-close="!loading"` + `setResult()` via ref
- Auto-close timeout is exactly 2000ms in all dialogs except CnMassImportDialog (no auto-close)
- All dialogs clean up timeouts in `beforeDestroy`

**CnIndexPage integration — verified:**
- All 8 dialog types are imported and rendered conditionally via `v-if` on visibility data properties
- 7 named `setXxxResult()` forwarding methods + `openFormDialog()` are exposed as public ref methods
- `useAdvancedFormDialog` prop switches between CnFormDialog and CnAdvancedFormDialog
- `#form-dialog`, `#delete-dialog`, `#copy-dialog` slots allow full dialog replacement
- `#form-fields` and `#field-{key}` slots pass through to CnFormDialog
- `#import-fields` slot passes through to CnMassImportDialog's `#fields` slot

## Standards & References

- **Nextcloud Vue** — Uses NcDialog for the dialog shell, NcNoteCard for result messages, NcButton for actions, NcSelect/NcTextField/NcCheckboxRadioSwitch for form widgets
- **Bootstrap-Vue** — CnAdvancedFormDialog uses BTabs/BTab for its tabbed interface (styled to match Nextcloud)
- **Vue 2 Options API** — All dialog components use Options API with `$set`/`$delete` for reactive property management
- **Two-phase pattern** — Custom pattern specific to this library; consistent UX convention across all Cn dialogs
- **WCAG AA** — Dialog focus management inherited from NcDialog; form validation shows inline error messages; remove buttons have aria-labels
- **Schema-driven forms** — CnFormDialog and CnAdvancedFormDialog generate fields from JSON Schema via `fieldsFromSchema()` utility (see schema-utilities spec)
- **CSS prefix** — All CSS classes use `cn-` prefix (e.g., `cn-delete__confirm`, `cn-form-dialog__field`, `cn-mass-import__results`)
- **Theming** — All styles use Nextcloud CSS variables only (`--color-border`, `--color-primary-element`, `--color-error`, etc.)

## Cross-References

- **index-page** spec — CnIndexPage dialog integration, slot pass-through, `setXxxResult` methods
- **schema-utilities** spec — `fieldsFromSchema()` function, `resolveWidget()` mapping, field definition structure
