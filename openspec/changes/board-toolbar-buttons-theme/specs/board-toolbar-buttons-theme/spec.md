# board-toolbar-buttons-theme Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-toolbar-buttons-theme](../../)

## Purpose

An index toolbar's buttons look as the boards draw them, also under a theme that styles buttons with `!important`.

## ADDED Requirements

### Requirement: Board toolbar buttons are neutral under a theme

In the board look the index toolbar SHALL set the nldesign button tokens so that its buttons draw at weight 600 and a
secondary button draws the main text on the main background with a `--color-border-dark` border. The Filter button
SHALL keep 12px side padding and 14px text.

#### Scenario: DqTeamwachtrij under the nldesign theme

- **GIVEN** dossiq's queue page in the board look under the nldesign theme
- **THEN** "Filter" and "Weergave opslaan" draw dark text at weight 600 on white with a grey border
