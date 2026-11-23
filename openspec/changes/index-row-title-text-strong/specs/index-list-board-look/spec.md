# index-list-board-look Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-row-title-text-strong](../../)

## ADDED Requirements

### Requirement: An index list takes every title look the table draws

An index page's `rowTitle` (manifest `config.rowTitle`) SHALL accept `link`, `plain`, `text` and `strong`, and SHALL
pass the value to its table, which draws the title column in that look in the board look.

#### Scenario: PtInzendingen names its submissions

- GIVEN an index page with `rowTitle: "strong"` in the board look
- WHEN the list renders
- THEN the title column reads at 14px, weight 600, in the main ink, without an underline, 76px in from the table edge

#### Scenario: PtAanvraagformulieren starts with an ordinary cell

- GIVEN an index page with `rowTitle: "text"` in the board look
- WHEN the list renders
- THEN the title column reads as an ordinary 14px cell at weight 400 in the main ink
