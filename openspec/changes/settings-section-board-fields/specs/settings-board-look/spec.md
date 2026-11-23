# settings-board-look Delta: settings-section-board-fields

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [settings-section-board-fields](../../)

## Purpose

A settings card's fields look like the board's: the label above the control.

## ADDED Requirements

### Requirement: A settings card labels its text fields above the control

In the board look, an `NcTextField`, `NcInputField` or `NcTextArea` with its label inside, placed in a settings section, SHALL draw that label above the control at 14px and weight 600 in the main text colour, with room above the field for it, and SHALL show its placeholder at rest. A field with its label outside, and every field in the default look, SHALL render as before. `CnSettingsSection`'s `#actions` slot SHALL render before the section content, where the board look places it at the end of the title row.

#### Scenario: Leadbeheer

- **GIVEN** pipelinq's Leadbeheer card in the board look with an `NcTextField` labelled "Verouderd na (dagen)"
- **THEN** the label sits above the input, not inside its border
- **AND** the label still names the input for a screen reader
