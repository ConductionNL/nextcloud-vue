# form-field-board-look Delta: board-field-label-over-placeholder

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-field-label-over-placeholder](../../)

## Purpose

A field's label and its placeholder are readable under the board look, whatever the theme.

## ADDED Requirements

### Requirement: A field label and its placeholder are never drawn over each other

Under the board look a Nextcloud text area or text field whose label sits inside the field SHALL hide its placeholder
while the field does not have focus, also when a theme forces placeholders visible, and SHALL show it on focus, when the
label has moved onto the border. A field with its label outside SHALL keep its placeholder.

#### Scenario: The DqTaak notes field

- **GIVEN** an NcTextArea with label "Een notitie toevoegen" and placeholder "Wat heb je gevonden, wie heb je gebeld?" under the board look, and a theme rule `::placeholder { opacity: 1 !important }`
- **WHEN** the field is empty and not focused
- **THEN** only the label is drawn
- **AND** on focus the placeholder shows under the raised label
