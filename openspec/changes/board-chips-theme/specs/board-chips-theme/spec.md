# board-chips-theme Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-chips-theme](../../)

## Purpose

Quick-filter and saved-view chips stay the board's pills under a theme that styles buttons with `!important`.

## ADDED Requirements

### Requirement: Board chips stay pills under a theme

In the board look a quick-filter tab, the overflow chip included, and a saved-view chip SHALL set the nldesign button
radius token to 19px and the weight token to 600.

#### Scenario: DqTeamwachtrij under the nldesign theme

- **GIVEN** dossiq's queue page in the board look under the nldesign theme
- **THEN** "Alle typen" and the overflow chip are 38px pills with labels at weight 600
