# board-save-view-ground Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-save-view-ground](../../)

## Purpose

Save view draws on the ground the boards draw.

## ADDED Requirements

### Requirement: Save view draws on the page's light primary

In the board look the Save view control SHALL draw on the page's `--color-primary-element-light` and its hover on the
page's `--color-primary-element-light-hover`, read outside the tertiary button so a theme's tertiary scope does not
change them.

#### Scenario: DqZaken under thematiq

- **GIVEN** dossiq's case list in the board look under the zuiddrecht theme
- **THEN** "Weergave opslaan" draws on #eaf0f7
