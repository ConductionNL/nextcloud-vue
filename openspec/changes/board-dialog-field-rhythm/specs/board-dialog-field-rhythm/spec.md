# board-dialog-field-rhythm Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dialog-field-rhythm](../../)

## Purpose

A board dialog's field rows follow the boards' rhythm.

## ADDED Requirements

### Requirement: A board dialog field row follows the board rhythm

In a board dialog a field's label, its optional note and its help line SHALL stand on the font's own leading, and a
search select SHALL have no block margin of its own, so the fields of a row sit level and each row starts where the
board draws it.

#### Scenario: DqNieuweZaak "Aanvrager" beside "Intakekanaal"

- **GIVEN** the new-case dialog in the board look, with "Visser" typed in "Aanvrager"
- **THEN** the "Aanvrager" field starts at the same height as "Intakekanaal" beside it
- **AND** its suggestions open within 4px of where the board draws them
