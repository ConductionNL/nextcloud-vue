# board-index-page-tabs Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-index-page-tabs](../../)

## Purpose

An index page's sibling-page tabs read as the board's folder tabs, not as links.

## ADDED Requirements

### Requirement: Board index page tabs are folder tabs in the main ink

In the board look, `.cn-index-page__page-tabs` SHALL draw no bottom border, and each `.cn-index-page__page-tab` SHALL
be in `--color-main-text` (also as `--nldesign-color-on-surface` and the link colour tokens), without an underline, at
14px and the normal line height. The open tab SHALL be 700 with a bottom edge in the main background. The Nextcloud look
SHALL be unchanged.

#### Scenario: Procurement tabs

- GIVEN DqContracten in the board look under thematiq
- WHEN the page tabs render
- THEN "Contracten" is 14px, 700, main ink, not underlined, and "Leveranciers" 14px, 400, main ink
