# cn-workspace-context-widgets Delta: write-feedback-toast-and-undo

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [write-feedback-toast-and-undo](../../)

## Purpose

`CnObjectListWidget` reports the writes it performs and lets a delete be
undone. Competitor row B16 of the dossiq round 2 analysis.

## ADDED Requirements

### Requirement: CnObjectListWidget reports its writes

After its create dialog saves, `CnObjectListWidget` SHALL rely on the dialog's
toast and SHALL NOT show a second one. After a row delete it SHALL show a
success toast with Undo for 10 s; Undo SHALL restore the row through the
OpenRegister trash endpoint and refresh the list. `feedback: false` in the
widget `content` SHALL suppress both toasts.

#### Scenario: One toast on create

- **GIVEN** an object-list widget with "+ Add"
- **WHEN** the user saves the create dialog
- **THEN** exactly one success toast renders

#### Scenario: Delete undone

- **GIVEN** a row deleted from the widget
- **WHEN** the user clicks Undo in the toast
- **THEN** the row is restored from the trash and appears in the list again

@e2e include Delete a row from an object-list widget; click Undo; assert the row is back and the trash restore request was made.
