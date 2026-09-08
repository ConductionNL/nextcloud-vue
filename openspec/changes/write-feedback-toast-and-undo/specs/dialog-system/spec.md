# dialog-system Delta: write-feedback-toast-and-undo

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [write-feedback-toast-and-undo](../../)

## Purpose

A save through `CnFormDialog` tells the user it landed. Competitor row B16 of
the dossiq round 2 analysis.

## ADDED Requirements

### Requirement: REQ-DG-019 CnFormDialog reports its write

After a successful save, `CnFormDialog` SHALL show a success toast naming the
object's title field, or the schema title when the schema has none. After a
failed save it SHALL show an error toast with the server message and keep the
dialog open. The prop `feedback` SHALL default to `true`; `false` SHALL
suppress the toasts and change nothing else.

#### Scenario: Save names the object

- **GIVEN** a schema with title field `title` and a form where the user typed "Permit for Dorpsstraat 1"
- **WHEN** the save succeeds
- **THEN** a success toast reads "Saved Permit for Dorpsstraat 1"

#### Scenario: Failure stays open

- **GIVEN** a save that answers 422 with "identifier already exists"
- **WHEN** the response arrives
- **THEN** an error toast shows that message and the dialog stays open with its values

#### Scenario: Feedback off

- **GIVEN** `feedback: false`
- **WHEN** the save succeeds
- **THEN** no toast renders and the `saved` event still fires

@e2e include Create an object through CnFormDialog; assert the toast text; repeat with `feedback: false`; assert no toast.
