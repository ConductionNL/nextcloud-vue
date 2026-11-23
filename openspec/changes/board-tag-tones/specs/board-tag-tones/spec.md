# board-tag-tones Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-tag-tones](../../)

## Purpose

Toned tags take the theme's status badge colours in the board look.

## ADDED Requirements

### Requirement: A toned board tag takes the theme's status badge tokens

In the board look a non-solid success, warning, error or info CnStatusBadge SHALL take its ground from
`--nldesign-component-status-badge-<tone>-background-color` and its ink from
`--nldesign-component-status-badge-<tone>-color`, falling back to the hue tokens and then Nextcloud's.

#### Scenario: dossiq's advanced settings

- **GIVEN** the zuiddrecht theme and the board look
- **THEN** the "Actief" tag is #1E6B2A on #E7F3EA
