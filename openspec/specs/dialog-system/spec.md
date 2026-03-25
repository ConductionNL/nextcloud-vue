# Dialog System — Components Spec

## Purpose
Specifies the two-phase dialog pattern used by all 7 dialog components: CnDeleteDialog, CnCopyDialog, CnFormDialog, CnMassDeleteDialog, CnMassCopyDialog, CnMassExportDialog, CnMassImportDialog.

---

## Requirements

### REQ-DG-001: Two-Phase Dialog Pattern

All dialogs MUST follow the two-phase confirm-then-result pattern.

#### Scenario: Confirm phase

- GIVEN a dialog is visible
- THEN it MUST show a form or confirmation prompt
- AND a confirm button and cancel button MUST be present
- AND cancel MUST emit `@close`

#### Scenario: Confirm triggers loading

- WHEN the user clicks the confirm button
- THEN the dialog MUST set `loading = true`
- AND the confirm button MUST show a loading spinner
- AND the dialog MUST emit `@confirm` with the relevant payload
- AND the dialog MUST NOT close itself

#### Scenario: Result phase (success)

- GIVEN the parent calls `setResult({ success: true })`
- THEN the dialog MUST show a success NcNoteCard
- AND loading MUST stop
- AND the dialog MUST auto-close after 2 seconds

#### Scenario: Result phase (error)

- GIVEN the parent calls `setResult({ error: 'Something went wrong' })`
- THEN the dialog MUST show an error NcNoteCard with the message
- AND loading MUST stop
- AND the dialog MUST NOT auto-close (user dismisses manually)

### REQ-DG-002: CnDeleteDialog — Single-Item Delete

#### Scenario: Delete confirmation

- GIVEN an item `{ id: '123', title: 'My Item' }`
- WHEN CnDeleteDialog renders
- THEN a warning MUST show "Are you sure you want to permanently delete \"My Item\"?"
- AND the warning text MUST support `{name}` placeholder substitution
- AND the confirm button MUST be `type="error"` with TrashCanOutline icon

#### Scenario: Name resolution

- GIVEN `nameField="title"` and item `{ title: 'Foo' }`
- THEN the display name MUST be "Foo"
- AND it MUST fallback to `item.name`, `item.title`, `item.id`

### REQ-DG-003: CnCopyDialog — Single-Item Copy

#### Scenario: Naming pattern selection

- GIVEN an item with name "Report Q1"
- WHEN CnCopyDialog renders
- THEN a pattern selector MUST offer 3 options: "Copy of {name}", "{name} - Copy", "{name} (Copy)"
- AND a preview MUST show the resulting name (e.g., "Report Q1" → "Copy of Report Q1")

#### Scenario: Confirm payload

- WHEN the user confirms
- THEN `@confirm` MUST emit `{ id, newName }` where newName uses the selected pattern

### REQ-DG-004: CnFormDialog — Schema-Driven Create/Edit

#### Scenario: Create mode

- GIVEN `item` is null and `schema` is provided
- THEN the dialog title MUST default to "Create {schema.title}"
- AND fields MUST be auto-generated via `fieldsFromSchema()`
- AND form data MUST be initialized with field defaults

#### Scenario: Edit mode

- GIVEN `item` is `{ id: '123', title: 'Foo', status: 'active' }`
- THEN the dialog title MUST default to "Edit {schema.title}"
- AND form data MUST be pre-populated from the item
- AND the confirm button MUST say "Save" (not "Create")

#### Scenario: Widget rendering

- GIVEN a field with `widget: 'select'`
- THEN an NcSelect MUST render with enum options
- AND for `widget: 'checkbox'` → NcCheckboxRadioSwitch (switch type)
- AND for `widget: 'textarea'` → native textarea
- AND for `widget: 'number'` → NcTextField type="number"
- AND for `widget: 'date'` → NcTextField type="date"
- AND for `widget: 'datetime'` → NcTextField type="datetime-local"
- AND for `widget: 'text'|'email'|'url'` → NcTextField with matching type

#### Scenario: Client-side validation

- GIVEN a required field is empty
- WHEN the user clicks confirm
- THEN validation MUST prevent submission
- AND the field MUST show "{Label} is required."
- AND minLength, maxLength, pattern, minimum, maximum MUST be enforced

#### Scenario: Server-side validation

- GIVEN the parent calls `setValidationErrors({ title: 'Already exists' })`
- THEN the title field MUST show "Already exists" as an error
- AND loading MUST stop

#### Scenario: Slot overrides (3 levels)

- GIVEN `#form` slot is provided
- THEN the entire auto-generated form MUST be replaced
- AND the slot MUST receive `{ fields, formData, errors, updateField }` scope

- GIVEN `#field-status` slot is provided
- THEN only the `status` field MUST be replaced
- AND the slot MUST receive `{ field, value, error, updateField }` scope

- GIVEN `#before-fields` or `#after-fields` slots are provided
- THEN content MUST be injected before/after the auto-generated fields

### REQ-DG-005: CnMassDeleteDialog — Bulk Delete

#### Scenario: Multi-item confirmation

- GIVEN 5 selected items
- THEN the dialog MUST list all item names
- AND show "Delete 5 items?" in the title

### REQ-DG-006: CnMassCopyDialog — Bulk Copy

#### Scenario: Naming patterns applied to all

- GIVEN 3 selected items and pattern "Copy of {name}"
- THEN a preview MUST show all 3 items with their new names

### REQ-DG-007: CnMassExportDialog — Bulk Export

#### Scenario: Format selection

- GIVEN export formats `[{ id: 'excel', label: 'Excel' }, { id: 'csv', label: 'CSV' }]`
- THEN the user MUST select a format before confirming
- AND `@confirm` MUST include `{ ids, format }`

### REQ-DG-008: CnMassImportDialog — Bulk Import

#### Scenario: File upload

- GIVEN the import dialog
- THEN the user MUST be able to upload a file
- AND optional import fields MUST be configurable via `#import-fields` slot

---

### Current Implementation Status

**All 7 dialog components exist and are implemented:**

- **CnDeleteDialog** — `src/components/CnDeleteDialog/CnDeleteDialog.vue` (170 lines). Two-phase pattern with confirmation and result display. Uses NcDialog, NcNoteCard, NcButton. Supports `nameField` prop for name resolution with fallback chain. Confirm button uses `type="error"` with TrashCanOutline icon.

- **CnCopyDialog** — `src/components/CnCopyDialog/CnCopyDialog.vue` (250 lines). Two-phase pattern with naming pattern selector (3 options: "Copy of {name}", "{name} - Copy", "{name} (Copy)"). Shows preview of resulting name. Emits `@confirm({ id, newName })`.

- **CnFormDialog** — `src/components/CnFormDialog/CnFormDialog.vue` (629 lines). Schema-driven create/edit form dialog. Auto-generates fields via `fieldsFromSchema()`. Supports:
  - Create mode (item=null) and Edit mode (item with data)
  - Widget rendering: select (NcSelect), checkbox (NcCheckboxRadioSwitch), textarea, number, date, datetime-local, text/email/url (NcTextField)
  - Client-side validation: required, minLength, maxLength, pattern, minimum, maximum
  - Server-side validation via `setValidationErrors()`
  - Three-level slot overrides: `#form` (full form replacement), `#field-{key}` (per-field), `#before-fields`/`#after-fields` (injection points)

- **CnMassDeleteDialog** — `src/components/CnMassDeleteDialog/CnMassDeleteDialog.vue`. Two-phase bulk delete with item list and count in title.

- **CnMassCopyDialog** — `src/components/CnMassCopyDialog/CnMassCopyDialog.vue`. Bulk copy with naming pattern applied to all selected items with preview.

- **CnMassExportDialog** — `src/components/CnMassExportDialog/CnMassExportDialog.vue`. Format selection (Excel, CSV, etc.) before confirming. Emits `@confirm({ ids, format })`.

- **CnMassImportDialog** — `src/components/CnMassImportDialog/CnMassImportDialog.vue`. File upload with optional `#import-fields` slot for configurable import settings.

**Two-phase pattern (REQ-DG-001) — implemented across all dialogs:**
- Confirm phase: form/confirmation prompt with confirm and cancel buttons
- Confirm triggers `loading = true`, shows spinner, emits `@confirm`, does NOT auto-close
- Success result: NcNoteCard success, auto-close after timeout
- Error result: NcNoteCard error, no auto-close

**Documentation pages exist** for all dialogs in `docs/components/`:
- cn-delete-dialog.md, cn-copy-dialog.md, cn-form-dialog.md, cn-mass-delete-dialog.md, cn-mass-copy-dialog.md, cn-mass-export-dialog.md, cn-mass-import-dialog.md

**CnIndexPage integration:** All single-object dialogs (Delete, Copy, Form) are built into CnIndexPage with slot overrides at three levels. Mass dialogs are triggered from CnMassActionBar within CnIndexPage.

**Not yet implemented / deviations:**
- The auto-close timeout for success may differ from the specified "2 seconds" — needs verification in each dialog
- The `setResult()` API naming may vary per dialog (CnIndexPage exposes `setFormResult`, `setSingleDeleteResult`, etc.)

### Standards & References

- **Nextcloud Vue** — Uses NcDialog for the dialog shell, NcNoteCard for result messages, NcButton for actions, NcSelect/NcTextField/NcCheckboxRadioSwitch for form widgets
- **Vue 2 Options API** — All dialog components use Options API
- **Two-phase pattern** — Custom pattern specific to this library; not a Nextcloud standard but a consistent UX convention across all Cn dialogs
- **WCAG AA** — Dialog focus management inherited from NcDialog; form validation shows inline error messages
- **Schema-driven forms** — CnFormDialog generates fields from JSON Schema via `fieldsFromSchema()` utility

### Specificity Assessment

- **Specific enough?** Yes, the two-phase pattern is well-defined and scenarios cover all key behaviors.
- **Missing/ambiguous:**
  - The auto-close timeout value (spec says 2 seconds) should be verified against implementation
  - No specification for how `setResult` is called — is it via ref methods, props, or events?
  - CnFormDialog's `excludeFields`, `includeFields`, `fieldOverrides` props are not specified here (they are in the index-page spec)
  - No specification for CnFormDialog's handling of nested object properties or array fields
  - The `{name}` placeholder substitution in CnDeleteDialog warning text is specified but the exact placeholder syntax is not
- **Open questions:**
  - Should the auto-close timeout be configurable per dialog?
  - Should CnFormDialog support multi-step forms or wizard-style dialogs?
  - Should the result phase support custom result content via slots?
