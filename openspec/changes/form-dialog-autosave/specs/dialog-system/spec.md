# dialog-system Delta: form-dialog-autosave

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [form-dialog-autosave](../../)

## Purpose

`CnFormDialog` keeps what the user typed and offers a server-side draft for
long forms. Competitor row B12 of the dossiq round 2 analysis.

## ADDED Requirements

### Requirement: REQ-DG-016 Local draft recovery

`CnFormDialog` SHALL persist the form values locally, debounced, under a key
made of app id, schema, object id or `new`, and user id. On open with a stored
draft newer than the object's `updated`, it SHALL show a recovery bar with
Restore and Discard. A successful save or Discard SHALL clear the entry. An
entry older than 7 days SHALL be ignored.

#### Scenario: Closed tab, values back

- **GIVEN** a create form where the user typed a title and closed the tab
- **WHEN** the same create form opens for the same user
- **THEN** the recovery bar shows and Restore fills the title back in

#### Scenario: Another user, no draft

- **GIVEN** a stored draft written by user A
- **WHEN** user B opens the same form in the same browser
- **THEN** no recovery bar shows

#### Scenario: Save clears the draft

- **GIVEN** a restored draft
- **WHEN** the user saves successfully
- **THEN** the storage entry is gone and a reopen shows no bar

@e2e include Type into a create form, reload the page, reopen the form; assert the recovery bar and the restored value; save; reopen; assert no bar.

### Requirement: REQ-DG-017 Server-side draft

With `allowDraft: true` and a schema field named by `draftField` (default
`isDraft`), `CnFormDialog` SHALL render a Save draft button. Save draft SHALL
skip required-field validation, set the draft field to `true` and save through
the store. Opening a draft object SHALL show a Publish button that runs full
validation and sets the draft field to `false`. Without `allowDraft` or
without the field, no draft controls SHALL render.

#### Scenario: Draft saved without required fields

- **GIVEN** `allowDraft: true`, a schema requiring `title` and `case`, and only `title` filled
- **WHEN** the user chooses Save draft
- **THEN** the object is saved with `isDraft: true` and `draft-saved` is emitted

#### Scenario: Publish enforces validation

- **GIVEN** a draft object missing `case`
- **WHEN** the user chooses Publish
- **THEN** the dialog shows the required-field error and no request is sent

#### Scenario: No field, no button

- **GIVEN** `allowDraft: true` on a schema without `isDraft`
- **WHEN** the dialog renders
- **THEN** no Save draft button renders

@e2e include Open a create dialog with `allowDraft` on a schema with `isDraft`; fill one field; Save draft; assert the saved object; reopen; Publish; assert the validation error.

### Requirement: REQ-DG-018 Saved indicator

`CnFormDialog` and `CnFormPage` SHALL show a footer indicator reading Saving
while a local write is pending and Saved with a relative time after it lands,
in an `aria-live="polite"` region, using Nextcloud CSS variables only.

#### Scenario: Indicator follows the write

- **GIVEN** an open form
- **WHEN** the user types and the debounce elapses
- **THEN** the indicator reads Saving, then Saved, and the live region announces once per change

@e2e include Type into a form; assert the indicator text moves to Saved.
