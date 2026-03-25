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

---

### Current Implementation Status

**Fully implemented** in `src/components/CnIndexPage/CnIndexPage.vue` (816 lines).

**REQ-IP-001 (Zero-Config Rendering) — implemented:**
- Renders CnPageHeader with title and optional schema icon via ICON_MAP
- CnActionsBar with primary Add button (NcButton with schema icon) and Actions overflow menu with Refresh
- CnDataTable (default view) or CnCardGrid (card view)
- CnPagination controls
- Built-in CnRowActions with View, Edit, Copy, Delete actions

**REQ-IP-002 (Dual View Mode) — implemented:**
- `viewMode` prop controls table vs card rendering
- CnDataTable renders with schema-driven columns and row selection
- CnCardGrid renders with card selection

**REQ-IP-003 (Built-In Row Actions) — implemented:**
- `showEditAction`, `showCopyAction`, `showDeleteAction` props control visibility
- View action appears when `@row-click` listener is attached (uses schema icon or Eye fallback)
- App-provided `actions` appear before built-in actions
- Delete action uses `destructive` styling

**REQ-IP-004 (Single-Object Dialogs) — implemented:**
- Edit: opens CnFormDialog in edit mode, emits `@edit(formData)`
- Delete: opens CnDeleteDialog, emits `@delete(id)`
- Copy: opens CnCopyDialog, emits `@copy({ id, newName })`
- Add: opens CnFormDialog in create mode (emits `@create`), or emits `@add` if listener attached (backward compat)

**REQ-IP-005 (Dialog Slot Overrides) — implemented:**
- `#form-dialog="{ item, schema, close }"` replaces CnFormDialog
- `#delete-dialog="{ item, close }"` replaces CnDeleteDialog
- `#copy-dialog="{ item, close }"` replaces CnCopyDialog
- `#form-fields` replaces form content inside CnFormDialog
- `#field-{key}` replaces individual fields

**REQ-IP-006 (Mass Actions) — implemented:**
- CnMassActionBar with Mass Delete, Mass Copy, Mass Export, Mass Import buttons
- Corresponding mass dialog components open on click
- `showMassDelete`, `showMassCopy`, `showMassExport`, `showMassImport` props control visibility
- Events: `@mass-delete(ids)`, `@mass-copy(payload)`, `@mass-export(payload)`, `@mass-import(payload)`

**REQ-IP-007 (Public Ref Methods) — implemented:**
- `setFormResult()`, `setSingleDeleteResult()`, `setSingleCopyResult()`
- `setMassDeleteResult()`, `setMassCopyResult()`, `setExportResult()`, `setImportResult()`
- `openFormDialog(item)` — programmatic open (null = create, object = edit)

**REQ-IP-008 (Schema Pass-Through) — implemented:**
- `excludeFields`, `includeFields`, `fieldOverrides` passed to CnFormDialog
- `excludeColumns`, `includeColumns`, `columnOverrides` passed to CnDataTable

**Sub-components used:** CnPageHeader, CnActionsBar, CnDataTable, CnCardGrid, CnPagination, CnRowActions, CnMassActionBar, CnDeleteDialog, CnCopyDialog, CnFormDialog, CnMassDeleteDialog, CnMassCopyDialog, CnMassExportDialog, CnMassImportDialog

**Documentation:** `docs/components/cn-index-page.md` exists.

**Not yet implemented / deviations:** All spec requirements appear to be implemented.

### Standards & References

- **Vue 2 Options API** — Component uses standard Options API pattern
- **Nextcloud Vue** — Leverages NcButton, NcActions, NcActionButton from `@nextcloud/vue`
- **Schema-driven** — Uses `columnsFromSchema()`, `fieldsFromSchema()` from `src/utils/schema.js`
- **CSS** — `cn-index-page` prefix, Nextcloud CSS variables, scoped styles
- **Translation** — All user-visible text configurable via props with English defaults
- **WCAG AA** — Table headers, keyboard-accessible row actions, dialog focus management (inherited from Nextcloud Vue)

### Specificity Assessment

- **Specific enough?** Yes, this is one of the most detailed specs in the library. Scenarios cover all major user interactions.
- **Missing/ambiguous:**
  - No specification for the `@refresh` event (it exists in the getting-started example but is not listed in this spec)
  - No specification for the `@sort` event pass-through to CnDataTable
  - No specification for `@page-changed` and `@page-size-changed` event pass-through to CnPagination
  - No specification for the `@search` event from CnFilterBar
  - The ICON_MAP referenced for schema icon resolution is not documented (how icons are mapped from schema `icon` field to Vue components)
  - No specification for loading and error states within the page
  - No specification for the `facets` or sidebar integration
- **Open questions:**
  - Should CnIndexPage support a `composable` mode where it works with `useListView` directly instead of requiring manual event wiring?
  - Should there be a specification for responsive behavior on mobile devices?
  - Should the Add button support a dropdown for multiple creation options?
