# CnIndexPage

## Purpose

CnIndexPage is the top-level, schema-driven index page component that assembles sub-components (CnPageHeader, CnActionsBar, CnDataTable, CnCardGrid, CnPagination, CnRowActions, CnMassActionBar, and all 7 dialog components) into a single zero-config page for listing, selecting, and managing objects. It serves as the primary entry point for all CRUD-oriented list views across Conduction apps (OpenRegister, Pipelinq, Procest, etc.), eliminating boilerplate by providing built-in pagination, sorting pass-through, dual view modes, three-level dialog overrides, mass actions, and optional store integration. When paired with the `useListView` composable, a consumer can render a fully functional index page with as few as 3 props.

**File**: `src/components/CnIndexPage/CnIndexPage.vue`

---

## Requirements

### Requirement: Schema-Driven Column Generation

CnIndexPage SHALL auto-generate table columns from the provided `schema` object via the `columnsFromSchema()` utility when no explicit `columns` prop is given. When explicit `columns` are provided, they SHALL take precedence over schema-derived columns. Column visibility SHALL be controllable via `excludeColumns`, `includeColumns`, and `columnOverrides` props.

#### Scenario: Auto-generate columns from schema

- **GIVEN** a `schema` with properties `title` (string), `status` (string, enum), `created` (string, format: date-time)
- **AND** no explicit `columns` prop is provided
- **WHEN** CnIndexPage renders in table view
- **THEN** CnDataTable MUST receive schema-derived columns via `columnsFromSchema()`
- **AND** column labels MUST come from `prop.title` or humanized key
- **AND** columns MUST be sorted by `prop.order` (ascending)

#### Scenario: Explicit columns override schema

- **GIVEN** a `schema` is provided AND a `columns` array `[{ key: 'title', label: 'Name', sortable: true }]` is provided
- **WHEN** CnIndexPage renders
- **THEN** CnDataTable MUST use the explicit `columns` array, NOT schema-derived columns

#### Scenario: Column filtering via excludeColumns

- **GIVEN** `excludeColumns=['id', 'uuid']` and a schema with properties `id`, `title`, `uuid`, `status`
- **WHEN** CnIndexPage renders
- **THEN** columns for `id` and `uuid` MUST NOT appear in CnDataTable
- **AND** `excludeColumns` MUST be passed through to CnDataTable

#### Scenario: Column whitelisting via includeColumns

- **GIVEN** `includeColumns=['title', 'status']` and a schema with properties `id`, `title`, `status`, `created`, `updated`
- **WHEN** CnIndexPage renders
- **THEN** only `title` and `status` columns MUST appear in CnDataTable

#### Scenario: Per-column overrides

- **GIVEN** `columnOverrides={ status: { label: 'State', width: '200px' } }`
- **WHEN** CnIndexPage renders
- **THEN** the `status` column label MUST be "State" and its width MUST be "200px"
- **AND** `columnOverrides` MUST be passed through to CnDataTable

**Cross-reference:** REQ-SU-001 (columnsFromSchema) in `schema-utilities/spec.md`

---

### Requirement: Table and Card View Toggle

CnIndexPage SHALL support two view modes (`table` and `cards`) controlled by the `viewMode` prop, with a toggle button rendered inside CnActionsBar when `showViewToggle` is true. Switching views MUST preserve selection state.

#### Scenario: Default table view

- **GIVEN** `viewMode='table'` (default)
- **WHEN** CnIndexPage renders
- **THEN** CnDataTable MUST render with rows from `objects` prop
- **AND** CnCardGrid MUST NOT render

#### Scenario: Card view

- **GIVEN** `viewMode='cards'`
- **WHEN** CnIndexPage renders
- **THEN** CnCardGrid MUST render with objects
- **AND** CnDataTable MUST NOT render
- **AND** each card MUST be overridable via `#card="{ object, selected }"` scoped slot

#### Scenario: Toggling view mode via UI

- **GIVEN** `showViewToggle=true` (default)
- **WHEN** the user clicks the view toggle button in CnActionsBar
- **THEN** `currentViewMode` MUST switch between `table` and `cards`
- **AND** `@view-mode-change(mode)` MUST emit with the new mode string

#### Scenario: Selection preserved across view switch

- **GIVEN** rows with IDs `['1', '3']` are selected in table view
- **WHEN** the user switches to card view
- **THEN** `internalSelectedIds` MUST still contain `['1', '3']`
- **AND** the corresponding cards MUST appear selected

#### Scenario: View toggle hidden

- **GIVEN** `showViewToggle=false`
- **WHEN** CnIndexPage renders
- **THEN** the view toggle button MUST NOT appear in CnActionsBar

**Cross-reference:** REQ-DD-001 (CnDataTable), REQ-DD-002 (CnCardGrid) in `data-display/spec.md`

---

### Requirement: Pagination via CnPagination

CnIndexPage SHALL render CnPagination when the `pagination` prop is provided and has more than one page. Pagination events MUST be re-emitted to the parent for server-side handling.

#### Scenario: Pagination renders when multi-page

- **GIVEN** `pagination={ page: 1, pages: 5, total: 98, limit: 20 }`
- **WHEN** CnIndexPage renders
- **THEN** CnPagination MUST render below the table/card area
- **AND** it MUST receive `currentPage=1`, `totalPages=5`, `totalItems=98`, `currentPageSize=20`

#### Scenario: Pagination hidden for single page

- **GIVEN** `pagination={ page: 1, pages: 1, total: 15, limit: 20 }`
- **WHEN** CnIndexPage renders
- **THEN** CnPagination MUST NOT render (condition: `pagination.pages > 1`)

#### Scenario: Page change event pass-through

- **WHEN** CnPagination emits `@page-changed(3)`
- **THEN** CnIndexPage MUST re-emit `@page-changed(3)` to the parent

#### Scenario: Page size change event pass-through

- **WHEN** CnPagination emits `@page-size-changed(50)`
- **THEN** CnIndexPage MUST re-emit `@page-size-changed(50)` to the parent

#### Scenario: No pagination prop

- **GIVEN** `pagination` is null
- **WHEN** CnIndexPage renders
- **THEN** CnPagination MUST NOT render

**Cross-reference:** REQ-DD-004 (CnPagination) in `data-display/spec.md`

---

### Requirement: Mass Actions

CnIndexPage SHALL provide mass action buttons (Delete, Copy, Export, Import) via CnActionsBar when items are selected. Each mass action MUST open its corresponding dialog component and emit a dedicated event on confirmation. Mass action visibility SHALL be individually controllable via boolean props.

#### Scenario: Mass delete flow

- **GIVEN** items with IDs `['1', '2', '3']` are selected AND `showMassDelete=true` (default)
- **WHEN** the user clicks Mass Delete in CnActionsBar
- **THEN** CnMassDeleteDialog MUST open with `items` set to the full selected objects (resolved from `objects` via `rowKey`)
- **AND** on confirmation, `@mass-delete(['1', '2', '3'])` MUST emit

#### Scenario: Mass copy flow

- **GIVEN** items are selected AND `showMassCopy=true` (default)
- **WHEN** the user clicks Mass Copy
- **THEN** CnMassCopyDialog MUST open with `items` set to the selected objects
- **AND** on confirmation, `@mass-copy(payload)` MUST emit where payload includes IDs and naming pattern

#### Scenario: Mass export flow

- **GIVEN** `showMassExport=true` (default) AND `exportFormats=[{ id: 'excel', label: 'Excel (.xlsx)' }, { id: 'csv', label: 'CSV (.csv)' }]` (default)
- **WHEN** the user clicks Mass Export
- **THEN** CnMassExportDialog MUST open with the configured `formats`
- **AND** on confirmation, `@mass-export(payload)` MUST emit with `{ ids, format }`

#### Scenario: Mass import flow

- **GIVEN** `showMassImport=true` (default)
- **WHEN** the user clicks Mass Import
- **THEN** CnMassImportDialog MUST open with `options` from the `importOptions` prop
- **AND** the `#import-fields` slot MUST be passed through if provided
- **AND** on confirmation, `@mass-import(payload)` MUST emit

#### Scenario: Disabling individual mass actions

- **GIVEN** `showMassDelete=false` AND `showMassExport=false`
- **WHEN** items are selected
- **THEN** the Mass Delete and Mass Export buttons MUST NOT appear in CnActionsBar
- **AND** Mass Copy and Mass Import buttons MUST still appear (if their respective show props are true)

**Cross-reference:** REQ-DG-005 through REQ-DG-008 in `dialog-system/spec.md`

---

### Requirement: Single-Object Dialogs (Form, Delete, Copy)

CnIndexPage SHALL provide built-in single-object dialogs for create/edit (CnFormDialog or CnAdvancedFormDialog), delete (CnDeleteDialog), and copy (CnCopyDialog). Each dialog follows the two-phase confirm-then-result pattern. The Add button SHALL open the form dialog in create mode; row actions SHALL open dialogs in the appropriate mode.

#### Scenario: Edit action opens form dialog

- **GIVEN** `showEditAction=true` (default)
- **WHEN** the user clicks the Edit row action on a row `{ id: '123', title: 'Foo' }`
- **THEN** CnFormDialog MUST open in edit mode with `item` set to the row data
- **AND** on confirmation, `@edit(formData)` MUST emit with the form data including `id`

#### Scenario: Delete action opens delete dialog

- **GIVEN** `showDeleteAction=true` (default)
- **WHEN** the user clicks the Delete row action on a row `{ id: '123', title: 'Foo' }`
- **THEN** CnDeleteDialog MUST open with `item` set to the row
- **AND** the item name MUST be resolved using `massActionNameField` prop (default: `'title'`)
- **AND** on confirmation, `@delete('123')` MUST emit with the item ID

#### Scenario: Copy action opens copy dialog

- **GIVEN** `showCopyAction=true` (default)
- **WHEN** the user clicks the Copy row action on a row
- **THEN** CnCopyDialog MUST open with `item` set to the row
- **AND** on confirmation, `@copy({ id, newName })` MUST emit

#### Scenario: Add button opens form dialog in create mode

- **GIVEN** NO `@add` listener is attached AND `showFormDialog=true` (default)
- **WHEN** the user clicks the Add button in CnActionsBar
- **THEN** CnFormDialog MUST open with `item=null` (create mode)
- **AND** the dialog title MUST default to "Create {schema.title}"
- **AND** on confirmation, `@create(formData)` MUST emit

#### Scenario: Add button backward compatibility

- **GIVEN** an `@add` listener IS attached to CnIndexPage
- **WHEN** the user clicks the Add button
- **THEN** `@add` MUST emit (the form dialog MUST NOT open)
- **AND** the consumer is responsible for their own creation flow (e.g., Procest CaseList navigates to a custom CaseCreateDialog)

#### Scenario: Advanced form dialog mode

- **GIVEN** `useAdvancedFormDialog=true`
- **WHEN** the Add or Edit action triggers the form dialog
- **THEN** CnAdvancedFormDialog MUST render instead of CnFormDialog
- **AND** it MUST receive the same props: `schema`, `item`, `excludeFields`, `includeFields`, `fieldOverrides`, `massActionNameField`

**Cross-reference:** REQ-DG-001 through REQ-DG-004 in `dialog-system/spec.md`

---

### Requirement: Three-Level Dialog Slot Override System

CnIndexPage SHALL allow consumer apps to override dialogs at three levels of granularity: full dialog replacement, form content replacement, and per-field replacement. This enables progressive customization without forking the component.

#### Scenario: Full form dialog replacement

- **GIVEN** the parent provides `#form-dialog="{ item, schema, close }"`
- **WHEN** the form dialog would normally open
- **THEN** the built-in CnFormDialog MUST be entirely replaced by the slot content
- **AND** the slot MUST receive `item` (null for create, object for edit), `schema`, and `close` function

#### Scenario: Full delete dialog replacement

- **GIVEN** the parent provides `#delete-dialog="{ item, close }"`
- **WHEN** the delete dialog would normally open
- **THEN** the built-in CnDeleteDialog MUST be entirely replaced by the slot content

#### Scenario: Full copy dialog replacement

- **GIVEN** the parent provides `#copy-dialog="{ item, close }"`
- **WHEN** the copy dialog would normally open
- **THEN** the built-in CnCopyDialog MUST be entirely replaced by the slot content

#### Scenario: Form content override (Level 2)

- **GIVEN** the parent provides `#form-fields="{ fields, formData, errors, updateField }"`
- **WHEN** the form dialog opens
- **THEN** the auto-generated form fields inside CnFormDialog MUST be replaced by the slot content
- **BUT** the dialog shell (title bar, confirm/cancel buttons, result phase display) MUST remain
- **AND** the slot MUST receive the scoped data: `fields`, `formData`, `errors`, and `updateField` function
- **AND** this is the pattern used by OpenRegister's RegistersIndex for custom form fields

#### Scenario: Per-field override (Level 3)

- **GIVEN** the parent provides `#field-status="{ field, value, error, updateField }"`
- **WHEN** the form dialog renders
- **THEN** only the `status` field MUST be replaced by the slot content
- **AND** all other fields MUST render with the default auto-generated widgets

---

### Requirement: Built-In Row Actions

CnIndexPage SHALL auto-generate row actions (View, Edit, Copy, Delete) based on `show*Action` props and listener detection. App-provided `actions` SHALL appear before built-in actions. Row actions MUST be rendered via CnRowActions in both table and card views.

#### Scenario: Default row actions

- **GIVEN** `showEditAction=true`, `showCopyAction=true`, `showDeleteAction=true` (all defaults)
- **AND** a `@row-click` listener is attached
- **WHEN** CnIndexPage renders row actions
- **THEN** `mergedActions` MUST contain, in order: any app-provided `actions`, then View, Edit, Copy, Delete
- **AND** View icon MUST be the schema icon (from ICON_MAP) or Eye fallback
- **AND** Edit icon MUST be Pencil
- **AND** Copy icon MUST be ContentCopy
- **AND** Delete icon MUST be TrashCanOutline with `destructive: true`

#### Scenario: View action appears only with row-click listener

- **GIVEN** NO `@row-click` listener is attached
- **WHEN** CnIndexPage computes `defaultActions`
- **THEN** the View action MUST NOT be included
- **AND** only Edit, Copy, Delete actions MUST appear (if their show props are true)

#### Scenario: Disabling individual row actions

- **GIVEN** `showEditAction=false` AND `showDeleteAction=false`
- **WHEN** CnIndexPage renders row actions
- **THEN** only the Copy action (and View, if `@row-click` is attached) MUST appear

#### Scenario: Custom row actions slot

- **GIVEN** the parent provides `#row-actions="{ row }"`
- **WHEN** row actions render
- **THEN** the built-in CnRowActions MUST be entirely replaced by the slot content
- **AND** this is the pattern used by OpenRegister's RegistersIndex for custom actions (Publish, Import, View API Documentation, etc.)

#### Scenario: App-provided actions array

- **GIVEN** `actions=[{ label: 'Archive', icon: ArchiveIcon, handler: (row) => archive(row) }]`
- **WHEN** CnIndexPage renders row actions
- **THEN** "Archive" MUST appear before the built-in View, Edit, Copy, Delete actions

**Cross-reference:** CnRowActions in `data-display/spec.md`

---

### Requirement: Search and Sort Integration

CnIndexPage SHALL pass through sort events from CnDataTable to the parent. Column sorting MUST be handled server-side; CnIndexPage does not sort data internally.

#### Scenario: Sort event pass-through

- **GIVEN** a sortable column `title` exists in CnDataTable
- **WHEN** the user clicks the `title` column header
- **THEN** CnDataTable emits `@sort({ key: 'title', order: 'asc' })`
- **AND** CnIndexPage MUST re-emit `@sort({ key: 'title', order: 'asc' })` to the parent

#### Scenario: Controlled sort state

- **GIVEN** `sortKey='created'` and `sortOrder='desc'`
- **WHEN** CnIndexPage renders
- **THEN** CnDataTable MUST receive `sortKey='created'` and `sortOrder='desc'`
- **AND** the sort indicator on the `created` column MUST show descending

#### Scenario: Sort state via useListView composable

- **GIVEN** a consumer uses `useListView('client', { defaultSort: { key: 'deadline', order: 'asc' } })`
- **WHEN** the component mounts
- **THEN** CnIndexPage receives `sortKey='deadline'` and `sortOrder='asc'` from the composable
- **AND** the composable's `onSort` handler is wired to `@sort`

**Cross-reference:** REQ-DD-001 (sorting) in `data-display/spec.md`, `use-list-view/spec.md`

---

### Requirement: Empty State

CnIndexPage SHALL display an empty state when `objects` is an empty array and `loading` is false. The empty state MUST be overridable via the `#empty` slot.

#### Scenario: Default empty state

- **GIVEN** `objects=[]` AND `loading=false`
- **WHEN** CnIndexPage renders
- **THEN** NcEmptyContent MUST render with the `emptyText` prop (default: "No items found")
- **AND** the icon MUST be the resolved schema icon (via CnIcon) or DatabaseSearch fallback
- **AND** CnDataTable/CnCardGrid MUST NOT render

#### Scenario: Custom empty state via slot

- **GIVEN** the parent provides `#empty`
- **AND** `objects=[]` AND `loading=false`
- **WHEN** CnIndexPage renders
- **THEN** the custom slot content MUST render instead of the default NcEmptyContent

#### Scenario: Custom empty text

- **GIVEN** `emptyText='No registers found'`
- **AND** `objects=[]`
- **WHEN** CnIndexPage renders
- **THEN** NcEmptyContent MUST show "No registers found"

---

### Requirement: Loading State

CnIndexPage SHALL display a loading indicator when the `loading` prop is true, and MUST hide the data table/card grid and empty state during loading.

#### Scenario: Loading indicator shown

- **GIVEN** `loading=true`
- **WHEN** CnIndexPage renders
- **THEN** NcLoadingIcon (size 32) MUST render inside `.cn-index-page__loading`
- **AND** CnDataTable, CnCardGrid, and the empty state MUST NOT render

#### Scenario: Loading clears when data arrives

- **GIVEN** `loading` transitions from `true` to `false`
- **AND** `objects` now contains items
- **WHEN** CnIndexPage re-renders
- **THEN** the loading indicator MUST disappear
- **AND** CnDataTable (or CnCardGrid) MUST render with the new data

#### Scenario: Loading with empty result

- **GIVEN** `loading` transitions from `true` to `false`
- **AND** `objects=[]`
- **WHEN** CnIndexPage re-renders
- **THEN** the loading indicator MUST disappear
- **AND** the empty state MUST render

---

### Requirement: Row Selection

CnIndexPage SHALL support row/card selection via checkboxes when `selectable` is true. Selection state MUST be maintained internally and synced with the parent via the `selectedIds` prop and `@select` event.

#### Scenario: Selecting a row

- **GIVEN** `selectable=true` (default)
- **WHEN** the user checks a row checkbox in CnDataTable
- **THEN** CnDataTable emits `@select(ids)` with updated selection
- **AND** CnIndexPage MUST update `internalSelectedIds`
- **AND** CnIndexPage MUST re-emit `@select(ids)` to the parent

#### Scenario: External selection sync

- **GIVEN** the parent sets `selectedIds=['1', '3']`
- **WHEN** CnIndexPage re-renders
- **THEN** `internalSelectedIds` MUST update to `['1', '3']` (via watcher)
- **AND** rows 1 and 3 MUST appear selected in CnDataTable

#### Scenario: Selection enables mass actions

- **GIVEN** `internalSelectedIds` is not empty
- **WHEN** CnActionsBar renders
- **THEN** mass action buttons (Delete, Copy, Export, Import) MUST become visible (based on their show props)
- **AND** `selectedObjects` computed MUST resolve the full objects from `objects` for mass dialog props

#### Scenario: Disabling selection

- **GIVEN** `selectable=false`
- **WHEN** CnIndexPage renders
- **THEN** row checkboxes MUST NOT appear in CnDataTable
- **AND** card checkboxes MUST NOT appear in CnCardGrid
- **AND** mass action buttons MUST NOT appear

---

### Requirement: Actions Bar and Add Button

CnIndexPage SHALL render CnActionsBar with a primary Add button, optional action items, and a Refresh action. The Add button label and icon SHALL be derived from the schema or overridable via props.

#### Scenario: Add button with schema-derived label

- **GIVEN** `schema={ title: 'Register' }` AND no `addLabel` prop
- **WHEN** CnIndexPage renders
- **THEN** the Add button label MUST be "Add Register" (computed via `resolvedAddLabel`)
- **AND** the Add button icon MUST be the schema icon (via `resolvedIcon`)

#### Scenario: Custom add label

- **GIVEN** `addLabel='Create New Client'`
- **WHEN** CnIndexPage renders
- **THEN** the Add button MUST display "Create New Client"

#### Scenario: Refresh action

- **WHEN** the user clicks Refresh in the CnActionsBar overflow menu
- **THEN** `@refresh` MUST emit to the parent

#### Scenario: Extra action items via slot

- **GIVEN** the parent provides `#action-items`
- **WHEN** CnActionsBar renders
- **THEN** the slot content MUST appear as additional NcActionButton items in the overflow menu
- **AND** this is the pattern used by OpenRegister to add Import, View APIs, and Warmup Names Cache actions

#### Scenario: Extra header actions via slot

- **GIVEN** the parent provides `#header-actions`
- **WHEN** CnActionsBar renders
- **THEN** the slot content MUST appear in the header actions area

#### Scenario: Custom mass action buttons via slot

- **GIVEN** the parent provides `#mass-actions="{ count, selectedIds }"`
- **WHEN** items are selected
- **THEN** the slot content MUST render alongside (or instead of) the default mass action buttons

---

### Requirement: Public Ref Methods for Dialog Results

CnIndexPage SHALL expose public methods via `$refs` that allow parents to forward API operation results to the appropriate dialog. Each method MUST delegate to the underlying dialog component's `setResult()` method.

#### Scenario: Setting form dialog result (success)

- **GIVEN** a form dialog is open and the parent has handled the `@create` or `@edit` event
- **WHEN** the parent calls `this.$refs.indexPage.setFormResult({ success: true })`
- **THEN** the form dialog MUST show a success NcNoteCard
- **AND** the dialog MUST auto-close after the configured timeout

#### Scenario: Setting form dialog result (error)

- **GIVEN** a form dialog is open
- **WHEN** the parent calls `this.$refs.indexPage.setFormResult({ error: 'Title already exists' })`
- **THEN** the form dialog MUST show an error NcNoteCard with the message
- **AND** the dialog MUST NOT auto-close

#### Scenario: All result setter methods

- **THEN** CnIndexPage MUST expose ALL of the following public methods:
  - `setFormResult(resultData)` -- forwards to CnFormDialog/CnAdvancedFormDialog
  - `setSingleDeleteResult(resultData)` -- forwards to CnDeleteDialog
  - `setSingleCopyResult(resultData)` -- forwards to CnCopyDialog
  - `setMassDeleteResult(resultData)` -- forwards to CnMassDeleteDialog
  - `setMassCopyResult(resultData)` -- forwards to CnMassCopyDialog
  - `setExportResult(resultData)` -- forwards to CnMassExportDialog
  - `setImportResult(resultData)` -- forwards to CnMassImportDialog

#### Scenario: Programmatic dialog open

- **WHEN** the parent calls `this.$refs.indexPage.openFormDialog(null)`
- **THEN** the form dialog MUST open in create mode (`editItem=null`)
- **WHEN** the parent calls `this.$refs.indexPage.openFormDialog(row)`
- **THEN** the form dialog MUST open in edit mode (`editItem=row`)
- **AND** this is the pattern used by OpenRegister's RegistersIndex for the Edit action in custom row actions

#### Scenario: Deprecated aliases

- **THEN** `setDeleteResult()` MUST delegate to `setMassDeleteResult()` (deprecated)
- **AND** `setCopyResult()` MUST delegate to `setMassCopyResult()` (deprecated)

**Cross-reference:** REQ-DG-001 (two-phase pattern) in `dialog-system/spec.md`

---

### Requirement: Schema and Field Pass-Through

CnIndexPage SHALL pass schema-related configuration props through to both CnDataTable (column config) and CnFormDialog (field config), ensuring the same schema drives both the table display and the create/edit form.

#### Scenario: Column configuration pass-through

- **GIVEN** `excludeColumns=['id']`, `includeColumns=['title', 'status']`, `columnOverrides={ title: { width: '300px' } }`
- **WHEN** CnDataTable renders
- **THEN** it MUST receive `excludeColumns`, `includeColumns`, and `columnOverrides` as props

#### Scenario: Field configuration pass-through

- **GIVEN** `excludeFields=['id', 'uuid']`, `includeFields=['title', 'description', 'status']`, `fieldOverrides={ status: { widget: 'select' } }`
- **WHEN** the form dialog opens
- **THEN** CnFormDialog MUST receive `excludeFields`, `includeFields`, and `fieldOverrides` as props
- **AND** these MUST filter and customize the fields generated by `fieldsFromSchema()`

#### Scenario: Name field for dialogs

- **GIVEN** `massActionNameField='name'`
- **WHEN** any dialog opens (Delete, Copy, Form, or mass variants)
- **THEN** the dialog MUST use `name` as the property to display the item's name
- **AND** fallback resolution MUST follow: item[nameField] -> item.name -> item.title -> item.id

**Cross-reference:** REQ-SU-001, REQ-SU-002 in `schema-utilities/spec.md`

---

### Requirement: Custom Column Cell Rendering

CnIndexPage SHALL pass through `#column-{key}` scoped slots from the parent to CnDataTable, allowing consumers to override how individual column cells are rendered without replacing the entire table.

#### Scenario: Custom column slot pass-through

- **GIVEN** the parent provides `#column-title="{ row, value }"`
- **WHEN** CnDataTable renders
- **THEN** the `title` column cells MUST render the custom slot content instead of the default CnCellRenderer
- **AND** the slot MUST receive `row` (full row object) and `value` (cell value)

#### Scenario: Multiple custom columns

- **GIVEN** the parent provides `#column-title`, `#column-schemas`, `#column-created`, `#column-updated`
- **WHEN** CnDataTable renders
- **THEN** all four columns MUST use their respective custom slot content
- **AND** other columns MUST render with the default CnCellRenderer
- **AND** this is the pattern used by OpenRegister's RegistersIndex (custom title with managed badge, schemas count, date formatting)

#### Scenario: Custom column in card view

- **GIVEN** `viewMode='cards'`
- **WHEN** the parent provides `#column-status`
- **THEN** column slots MUST NOT affect card rendering (they are table-specific)
- **AND** card customization MUST use the `#card` slot instead

#### Scenario: Slot detection via slotColumns computed

- **GIVEN** the parent provides slots `#column-title` and `#column-status`
- **WHEN** CnIndexPage computes `slotColumns`
- **THEN** it MUST return `['title', 'status']` (extracted from `$scopedSlots` keys starting with `column-`)

---

### Requirement: Store Integration

CnIndexPage SHALL optionally integrate with a Pinia store (via `store` and `objectType` props) to automatically save form data on create/edit confirmation, bypassing the need for parent event handling.

#### Scenario: Store-based save on create

- **GIVEN** `store` is a Pinia store instance AND `objectType='1-2'` (register-schema slug)
- **WHEN** the user confirms the form dialog with new data
- **THEN** CnIndexPage MUST call `store.saveObject(objectType, formData)`
- **AND** on success, MUST call `setFormResult({ success: true })` and emit `@create(savedObject)`
- **AND** the form dialog MUST show success and auto-close

#### Scenario: Store-based save on edit

- **GIVEN** `store` and `objectType` are set AND `editItem` is not null
- **WHEN** the user confirms the form dialog
- **THEN** CnIndexPage MUST call `store.saveObject(objectType, formData)`
- **AND** on success, emit `@edit(savedObject)`

#### Scenario: Store save error

- **GIVEN** `store.saveObject()` returns falsy
- **WHEN** the save completes
- **THEN** CnIndexPage MUST call `store.getError(objectType)` to get the error message
- **AND** MUST call `setFormResult({ error: message })` to show the error in the dialog

#### Scenario: Missing objectType warning

- **GIVEN** `store` is set BUT `objectType` is empty
- **WHEN** the form dialog confirms
- **THEN** a `console.warn` MUST fire: "[CnIndexPage] store prop is set but objectType is missing. Cannot save to store."
- **AND** the save MUST NOT proceed

#### Scenario: No store (default behavior)

- **GIVEN** `store` is null (default)
- **WHEN** the form dialog confirms
- **THEN** `@edit(formData)` or `@create(formData)` MUST emit as normal (no store interaction)
- **AND** the parent is responsible for calling `setFormResult()` after their API call

**Cross-reference:** `store/spec.md` (useObjectStore)

---

### Requirement: Responsive Layout

CnIndexPage SHALL use a flex column layout that fills available height, with scrollable content area and fixed pagination position.

#### Scenario: Full-height layout

- **GIVEN** CnIndexPage renders inside NcAppContent
- **THEN** `.cn-index-page` MUST use `display: flex; flex-direction: column; height: 100%`
- **AND** `.cn-index-page__body` MUST use `flex: 1; min-height: 0` to allow scrolling
- **AND** `.cn-index-page__main` MUST use `overflow-y: auto` for scrollable content

#### Scenario: Page header visibility

- **GIVEN** `showTitle=false` (default)
- **WHEN** CnIndexPage renders
- **THEN** CnPageHeader MUST NOT render (title shown in sidebar instead)
- **WHEN** `showTitle=true`
- **THEN** CnPageHeader MUST render with `title`, `description`, and `resolvedIcon`

#### Scenario: Row class function

- **GIVEN** `rowClass` is a function `(row) => row.overdue ? 'row--overdue' : ''`
- **WHEN** CnDataTable renders
- **THEN** `rowClass` MUST be passed through to CnDataTable for per-row CSS class application
- **AND** this is the pattern used by both OpenRegister (managed badge borders) and Procest (overdue case borders)

---

### Requirement: Icon Resolution

CnIndexPage SHALL resolve icons from the schema or explicit `icon` prop, using the ICON_MAP from CnIcon to map icon name strings to Vue component references.

#### Scenario: Schema icon resolution

- **GIVEN** `schema={ icon: 'database' }` AND no explicit `icon` prop
- **WHEN** CnIndexPage computes `resolvedIcon`
- **THEN** it MUST return `'database'`
- **AND** `schemaIconComponent` MUST resolve via `ICON_MAP['database']`

#### Scenario: Explicit icon overrides schema

- **GIVEN** `icon='folder'` AND `schema={ icon: 'database' }`
- **WHEN** CnIndexPage computes `resolvedIcon`
- **THEN** it MUST return `'folder'` (explicit prop takes precedence)

#### Scenario: Icon fallback

- **GIVEN** no `icon` prop AND `schema` has no `icon` property
- **WHEN** CnIndexPage computes `resolvedIcon`
- **THEN** it MUST return `''` (empty string)
- **AND** `schemaIconComponent` MUST fall back to the Eye icon component

#### Scenario: Icon usage across component

- **THEN** `resolvedIcon` MUST be used in:
  - CnPageHeader (page icon)
  - CnActionsBar Add button (button icon)
  - Empty state NcEmptyContent (empty state icon, with DatabaseSearch fallback)
  - View row action (action icon)

---

## Complete Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | *required* | Page title |
| `description` | String | `''` | Description below title |
| `showTitle` | Boolean | `false` | Show inline page header (vs sidebar) |
| `icon` | String | `''` | MDI icon name override |
| `schema` | Object | `null` | JSON Schema for column/field generation |
| `columns` | Array | `[]` | Manual column definitions (overrides schema) |
| `objects` | Array | `[]` | Row/card data array |
| `pagination` | Object | `null` | `{ page, pages, total, limit }` |
| `loading` | Boolean | `false` | Shows loading indicator |
| `selectable` | Boolean | `true` | Enable row/card selection |
| `selectedIds` | Array | `[]` | Externally controlled selection |
| `viewMode` | String | `'table'` | `'table'` or `'cards'` |
| `sortKey` | String | `null` | Active sort column key |
| `sortOrder` | String | `'asc'` | `'asc'` or `'desc'` |
| `rowKey` | String | `'id'` | Unique row identifier property |
| `excludeColumns` | Array | `[]` | Column keys to exclude |
| `includeColumns` | Array | `null` | Column keys to include (whitelist) |
| `columnOverrides` | Object | `{}` | Per-column config overrides |
| `actions` | Array | `[]` | App-provided row action definitions |
| `emptyText` | String | `'No items found'` | Text for empty state |
| `rowClass` | Function | `null` | `(row) => string` for row CSS classes |
| `addLabel` | String | `''` | Override Add button label |
| `inlineActionCount` | Number | `2` | Max inline row action buttons |
| `showMassImport` | Boolean | `true` | Show mass Import button |
| `showMassExport` | Boolean | `true` | Show mass Export button |
| `showMassCopy` | Boolean | `true` | Show mass Copy button |
| `showMassDelete` | Boolean | `true` | Show mass Delete button |
| `massActionNameField` | String | `'title'` | Property for item name display in dialogs |
| `exportFormats` | Array | `[{ id: 'excel', label: 'Excel (.xlsx)' }, { id: 'csv', label: 'CSV (.csv)' }]` | Export format options |
| `importOptions` | Array | `[]` | Import option definitions |
| `showFormDialog` | Boolean | `true` | Enable built-in form dialog |
| `useAdvancedFormDialog` | Boolean | `false` | Use CnAdvancedFormDialog instead of CnFormDialog |
| `showEditAction` | Boolean | `true` | Show Edit row action |
| `showCopyAction` | Boolean | `true` | Show Copy row action |
| `showDeleteAction` | Boolean | `true` | Show Delete row action |
| `excludeFields` | Array | `[]` | Field keys to exclude from form dialog |
| `includeFields` | Array | `null` | Field keys to include in form (whitelist) |
| `fieldOverrides` | Object | `{}` | Per-field config overrides for form dialog |
| `showViewToggle` | Boolean | `true` | Show table/card view toggle |
| `store` | Object | `null` | Pinia store for automatic save integration |
| `objectType` | String | `''` | Object type slug for store integration |

## Complete Events Reference

| Event | Payload | Description |
|-------|---------|-------------|
| `@add` | `void` | Add button clicked (backward compat, only if listener attached) |
| `@create` | `object` (formData) | Form dialog create confirmed |
| `@edit` | `object` (formData with id) | Form dialog edit confirmed |
| `@delete` | `string` (item ID) | Single delete confirmed |
| `@copy` | `{ id, newName }` | Single copy confirmed |
| `@mass-delete` | `string[]` (IDs) | Mass delete confirmed |
| `@mass-copy` | `object` ({ ids, pattern }) | Mass copy confirmed |
| `@mass-export` | `object` ({ ids, format }) | Mass export confirmed |
| `@mass-import` | `object` (import data) | Mass import confirmed |
| `@refresh` | `void` | Refresh button clicked |
| `@row-click` | `object` (row) | Table row or card clicked |
| `@sort` | `{ key, order }` | Column sort changed |
| `@page-changed` | `number` (page) | Pagination page changed |
| `@page-size-changed` | `number` (size) | Pagination page size changed |
| `@select` | `string[]` (IDs) | Selection changed |
| `@action` | `{ action, row }` | Row action triggered |
| `@view-mode-change` | `string` (mode) | View mode toggled |

## Complete Slots Reference

| Slot | Scope | Description |
|------|-------|-------------|
| `#form-dialog` | `{ item, schema, close }` | Replace entire form dialog |
| `#delete-dialog` | `{ item, close }` | Replace entire delete dialog |
| `#copy-dialog` | `{ item, close }` | Replace entire copy dialog |
| `#form-fields` | `{ fields, formData, errors, updateField }` | Replace form content inside CnFormDialog |
| `#import-fields` | `{ file }` | Extra fields in import dialog |
| `#empty` | -- | Custom empty state content |
| `#card` | `{ object, selected }` | Custom card template for card view |
| `#row-actions` | `{ row }` | Custom row actions (replaces CnRowActions) |
| `#column-{key}` | `{ row, value }` | Custom cell renderer for a specific column |
| `#mass-actions` | `{ count, selectedIds }` | Extra mass action buttons |
| `#action-items` | -- | Extra action bar overflow menu items |
| `#header-actions` | -- | Extra header action buttons |

## Sub-Components Used

CnPageHeader, CnActionsBar, CnIcon, CnDataTable, CnCardGrid, CnPagination, CnRowActions, CnMassDeleteDialog, CnMassCopyDialog, CnMassExportDialog, CnMassImportDialog, CnDeleteDialog, CnCopyDialog, CnFormDialog, CnAdvancedFormDialog

## Consumer App Usage Patterns

**OpenRegister (RegistersIndex):** Uses `#form-fields` for custom form, `#action-items` for Import/View APIs/Warmup Cache, `#card` for RegisterSchemaCard, `#column-*` for 4 custom columns, `#row-actions` for 8 custom actions including Publish/Depublish/Download OAS. Disables all built-in row actions and mass actions. Uses `rowClass` for managed register borders. Calls `openFormDialog(row)` programmatically from custom Edit action.

**Pipelinq (ContactList):** Minimal usage with `useListView` composable. Uses `@add` for navigation-based creation. Single `#column-client` slot for linked client name. Sort and pagination wired via composable.

**Procest (CaseList):** Uses `@add` to open custom CaseCreateDialog. Multiple `#column-*` slots for case ID, case type name resolution, QuickStatusDropdown, and deadline countdown. Uses `rowClass` for overdue case red borders. Composable-driven with `defaultSort`.

## Standards & References

- **Vue 2 Options API** -- Component uses standard Options API pattern
- **Nextcloud Vue** -- Leverages NcButton, NcLoadingIcon, NcEmptyContent from `@nextcloud/vue`
- **Schema-driven** -- Uses `columnsFromSchema()`, `fieldsFromSchema()` from `src/utils/schema.js`
- **CSS** -- `cn-index-page` prefix, Nextcloud CSS variables, styles in `src/css/index-page.css`
- **Translation** -- All user-visible text configurable via props with English defaults
- **WCAG AA** -- Table headers via CnDataTable, keyboard-accessible row actions via CnRowActions, dialog focus management inherited from Nextcloud Vue's NcDialog
- **Two-phase dialog pattern** -- All dialogs follow confirm-then-result pattern per `dialog-system/spec.md`
