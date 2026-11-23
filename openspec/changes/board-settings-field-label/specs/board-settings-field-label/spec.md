# board-settings-field-label Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-settings-field-label](../../)

## Purpose

A settings card's field label sits where the boards draw it, at the boards' weight, also under a theme.

## ADDED Requirements

### Requirement: A board settings label sits as drawn, also under a theme

In the board look, a text field or text area label in a settings card:

- SHALL sit at its normal line height, 6px above the control, the control 22px below the field's top;
- SHALL be weight 600 in the main ink, also under a theme that sets labels with `!important`.

A one-field form's inline save SHALL line up with the control. The Nextcloud look keeps its own fields.

#### Scenario: DqInstellingenAlgemeen "Huisstijl"

- **GIVEN** the general admin settings in the board look under the thematiq theme
- **THEN** the "Naam van de organisatie" label starts 14px (within 0.5px) under the card title, at weight 600
