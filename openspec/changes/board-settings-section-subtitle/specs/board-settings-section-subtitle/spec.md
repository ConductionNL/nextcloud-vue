# board-settings-section-subtitle Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-settings-section-subtitle](../../)

## Purpose

A settings card's description reads as its title's subtitle in the board look, also under a theme.

## ADDED Requirements

### Requirement: A board settings card draws its description as the title's subtitle

In the board look, a settings card's description:

- SHALL be 14px at line-height 1.5 in the muted ink, also under a theme that sets paragraphs with `!important`;
- SHALL sit directly under the title, beside the card's actions when it has them, with the actions centred on the
  title and description together;
- SHALL keep the narrow-card layout, where the actions drop under the text.

The Nextcloud look keeps its own description.

#### Scenario: DqVthInstellingen "Legesregels"

- **GIVEN** the VTH settings tab in the board look under the thematiq theme
- **THEN** the "Legesregels" description is 14px in the muted ink, 4px under the title
- **AND** the "Regel toevoegen" button sits beside the title and description

#### Scenario: DqInstellingen "Koppelingen"

- **GIVEN** the integrations settings tab in the board look under the thematiq theme
- **THEN** every card description is 14px in the muted ink
