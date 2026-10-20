# board-folder-pane-rows Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-folder-pane-rows](../../)

## Purpose

An index page's folder pane in the board look draws the boards' folder rows.

## ADDED Requirements

### Requirement: A board folder pane draws the board's folder rows

In the board look a row of `.cn-index-page__folder-pane` SHALL be at least 36px, padded 8px 10px, with an 8px corner, 14px
text at weight 400 (also through `--nldesign-component-button-font-weight`), and no folder icon. Each nested level SHALL be
18px further in inside the row (28px, 46px, 64px). The open folder SHALL draw on `--color-primary-element-light` in
`--color-primary-element-light-text` at 700.

#### Scenario: Departments

- **GIVEN** dossiq's Departments page in the board look with "Vergunningen" open under "Fysiek domein"
- **THEN** "Fysiek domein" starts 28px in, "Vergunningen" 46px in on the primary tint, as on board DqAfdelingen
