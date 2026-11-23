# board-toolbar-save-stays-on-row-one Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-toolbar-save-stays-on-row-one](../../)

## ADDED Requirements

### Requirement: Save view stays on row 1 beside the chips

In the board look, with the quick-filter chips in the actions bar, the chip bar SHALL leave room on row 1 for Save view
and wrap its chips inside its own width, so Save view stays on row 1, aligned to its top, and Filter with the view
switch starts the next row. The toolbar placement SHALL be unchanged.

#### Scenario: DqZaken

- GIVEN the cases table in the board look, six chips and the "Nog 15 filters" button
- THEN "Weergave opslaan" is on row 1 at the right
- AND row 2 starts with Filter at the left edge
