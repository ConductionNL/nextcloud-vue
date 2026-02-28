# CnIndexPage — Spec

## Purpose
Specifies the CnIndexPage component: a zero-config, schema-driven index page that assembles sub-components into a complete list/card view with dialogs, mass actions, and row actions.

**File**: `src/components/CnIndexPage/CnIndexPage.vue`

---

## Requirements

### REQ-IP-001: Zero-Config Rendering

CnIndexPage MUST render a complete index page from minimal props.

#### Scenario: Minimal usage

- GIVEN props `title`, `schema`, `objects`, `pagination`, `loading`
- WHEN CnIndexPage renders
- THEN it MUST show a page header with the title
- AND an actions bar with a primary Add button (with schema icon if available via ICON_MAP) and an Actions overflow menu containing Refresh
- AND a data table (default) or card grid
- AND pagination controls
- AND built-in row actions (View, Edit, Copy, Delete)

### REQ-IP-002: Dual View Mode

#### Scenario: Table view (default)

- GIVEN `viewMode='table'` (default)
- THEN CnDataTable MUST render with schema-driven columns
- AND rows MUST be selectable

#### Scenario: Card view

- GIVEN `viewMode='cards'`
- THEN CnCardGrid MUST render
- AND cards MUST be selectable

### REQ-IP-003: Built-In Row Actions

Default row actions MUST be generated based on `show*Action` props.

#### Scenario: Default actions

- GIVEN `showEditAction`, `showCopyAction`, `showDeleteAction` are all true (default)
- THEN each row MUST have Edit (Pencil icon), Copy (ContentCopy icon), Delete (TrashCanOutline icon, destructive) actions
- AND app-provided `actions` MUST appear before built-in actions

#### Scenario: View action

- GIVEN a `@row-click` listener is attached to CnIndexPage
- THEN each row MUST have a "View" action as the first built-in action
- AND the View action icon MUST be the schema icon (resolved via ICON_MAP) or fallback to Eye icon
- AND clicking View MUST emit `@row-click(row)`

#### Scenario: Disabling actions

- GIVEN `showDeleteAction=false`
- THEN the Delete action MUST NOT appear in row actions

### REQ-IP-004: Single-Object Dialogs

#### Scenario: Edit action

- WHEN the user clicks Edit on a row
- THEN CnFormDialog MUST open in edit mode with the row data
- AND `@edit(formData)` MUST emit when confirmed

#### Scenario: Delete action

- WHEN the user clicks Delete on a row
- THEN CnDeleteDialog MUST open with the row item
- AND `@delete(id)` MUST emit when confirmed

#### Scenario: Copy action

- WHEN the user clicks Copy on a row
- THEN CnCopyDialog MUST open with the row item
- AND `@copy({ id, newName })` MUST emit when confirmed

#### Scenario: Add button

- GIVEN no `@add` listener is attached
- WHEN the user clicks the Add button
- THEN CnFormDialog MUST open in create mode (item=null)
- AND `@create(formData)` MUST emit when confirmed

#### Scenario: Add button backward compat

- GIVEN an `@add` listener IS attached
- WHEN the user clicks the Add button
- THEN `@add` MUST emit (NOT the form dialog)

### REQ-IP-005: Dialog Slot Overrides (3 Levels)

Apps MUST be able to override any dialog at three levels.

#### Scenario: Full dialog replacement

- GIVEN the parent provides `#form-dialog="{ item, schema, close }"`
- THEN the built-in CnFormDialog MUST be replaced entirely
- AND the slot MUST receive the item, schema, and close function

- GIVEN the parent provides `#delete-dialog="{ item, close }"`
- THEN the built-in CnDeleteDialog MUST be replaced

- GIVEN the parent provides `#copy-dialog="{ item, close }"`
- THEN the built-in CnCopyDialog MUST be replaced

#### Scenario: Form content override

- GIVEN the parent provides `#form-fields`
- THEN the form content inside CnFormDialog MUST be replaced
- BUT the dialog shell (title, buttons, result phase) MUST remain

#### Scenario: Per-field override

- GIVEN the parent provides `#field-status` inside CnFormDialog
- THEN only the `status` field MUST be replaced in the auto-generated form

### REQ-IP-006: Mass Actions

#### Scenario: Mass action dialogs

- GIVEN items are selected
- WHEN the user clicks Mass Delete / Mass Copy / Mass Export / Mass Import
- THEN the corresponding mass dialog MUST open
- AND `@mass-delete(ids)`, `@mass-copy(payload)`, `@mass-export(payload)`, `@mass-import(payload)` MUST emit

#### Scenario: Toggling mass actions

- GIVEN `showMassDelete=false`
- THEN the Mass Delete button MUST NOT appear

### REQ-IP-007: Public Ref Methods

The component MUST expose ref methods for setting dialog results.

#### Scenario: Setting dialog results

- GIVEN a dialog is open and the parent has handled the `@confirm`
- WHEN the parent calls `this.$refs.indexPage.setFormResult({ success: true })`
- THEN the form dialog MUST show success and auto-close
- AND `setSingleDeleteResult`, `setSingleCopyResult`, `setMassDeleteResult`, `setMassCopyResult`, `setExportResult`, `setImportResult` MUST work the same way

#### Scenario: Programmatic dialog open

- WHEN the parent calls `this.$refs.indexPage.openFormDialog(item)`
- THEN the form dialog MUST open in edit mode (or create mode if null)

### REQ-IP-008: Schema Pass-Through

#### Scenario: Field configuration

- GIVEN `excludeFields`, `includeFields`, `fieldOverrides` props
- THEN these MUST be passed through to CnFormDialog
- AND CnDataTable MUST receive `excludeColumns`, `includeColumns`, `columnOverrides`
