# dialog-dedup-extensions

## ADDED Requirements

### Requirement: The shared dialogs and tree take app content without a copy

CnConfirmDialog MUST render its default slot below the message in the confirm phase. CnMassActionDialog MUST apply `variant` and `confirmIcon` to its primary button and emit the ids still on the list. CnMassDeleteDialog MUST keep its name, test ids and delete defaults. CnDialogActions MUST disable its primary button while `saving` or without `canSubmit`. CnTreeView MUST render its `#label` slot in every row at every depth. A consumer that passes none of these MUST get the markup it got before.

#### Scenario: a confirm with a checkbox

- GIVEN a CnConfirmDialog with a checkbox in its default slot
- WHEN the confirm phase shows
- THEN the checkbox is below the message

#### Scenario: a mass publish

- GIVEN a CnMassActionDialog with `confirm-icon="Publish"` and two items
- WHEN the user takes one item off the list and confirms
- THEN the dialog emits confirm with the id of the other item

#### Scenario: an old consumer

- GIVEN a CnMassDeleteDialog with only `items`
- THEN it renders the same markup as before CnMassActionDialog existed
