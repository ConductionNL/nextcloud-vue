# board-dialog-controls Delta: board-form-select-no-margin

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-form-select-no-margin](../../)

## Purpose

A select in a board form dialog lines up with the text fields beside it.

## ADDED Requirements

### Requirement: A board form dialog's select lines up with its text fields

In a board dialog, a select in a form field with the label outside it SHALL start as far under its label, and end as far
above its help line, as a text field does.

#### Scenario: DqNieuweZaak

- **WHEN** a handler opens Nieuwe zaak
- **THEN** the Zaaktype select's control starts level with the Titel field beside it
