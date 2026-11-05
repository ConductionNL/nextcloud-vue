# files-columns-by-flag-and-toolbar-selection Delta: files-browser

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [files-columns-by-flag-and-toolbar-selection](../../)

## ADDED Requirements

### Requirement: A column can be hidden unless a flag holds

A declared files column with `hidden: { not: <flag> }` (the flag resolved by the host, e.g. `@context.caseType.documentReview.enabled`) SHALL start hidden unless the flag is exactly `true`. It SHALL stay declared, so the Columns chooser lists it and a user's choice decides as before.

### Requirement: A selection action can sit in the toolbar

CnFilesBrowser SHALL take `toolbarSelectionActions` (the files widget's `toolbarSelectionActions`), declared as `bulkActions` plus `disabledReason`. Each SHALL be a toolbar button that turns the row checkboxes on, is disabled while no file is ticked with its reason (default "Select files first") as its description, and runs on the ticked files as a bulk action does. With only toolbar selection actions the bulk bar under the toolbar SHALL NOT be drawn.
