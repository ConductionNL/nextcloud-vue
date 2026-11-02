# board-dialog-help-normal-leading Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dialog-help-normal-leading](../../)

## Purpose

A board dialog's field help line stands on the leading the boards draw.

## ADDED Requirements

### Requirement: A board dialog field's help line stands on the font's own leading

In a board dialog the help line of an NcTextField or NcTextArea SHALL use the font's own leading (`line-height:
normal`), keeping its 13px muted ink and its 4px step under the control. Outside the board look Nextcloud's own help
line SHALL stay.

#### Scenario: PtUitnodigen

- **GIVEN** the invite dialog in the board look
- **THEN** the help line under "E-mailadres" is one 13px line on the font's own leading
- **AND** the note card under the fields moves no lower than the help lines make it

#### Scenario: The dossiq dialogs stay where they are

- **GIVEN** a dossiq board dialog (DqZaakLocatie, DqOverdragen, DqNieuweZaak)
- **THEN** no measured part moves by more than 1px
