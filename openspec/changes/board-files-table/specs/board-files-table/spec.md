# board-files-table Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-files-table](../../)

## Purpose

A file list in the board look reads as the board's compact table.

## ADDED Requirements

### Requirement: A board file list is the board's compact table

In the board look the CnFilesBrowser header cells SHALL sit on `--cn-board-table-head-bg` (fallback the near-white
mix the board tables use) at 14px weight 600 in the muted text colour, with 10px 12px of padding and no bottom rule.
The data cells SHALL be 14px with 11px 12px of padding, a `--cn-board-hairline` rule above each row and none below.
A row SHALL take the hover ground only under the pointer, not while focus sits in it. The column sort control SHALL be
the bare label at the header's size and weight, without a button's height, radius or ground. A file name SHALL be at
600 and underlined, its second line 14px. A row menu SHALL be the board's 34px bordered square, except in a row that
also carries the host's visible button, which keeps the bare menu. The Nextcloud look SHALL be unchanged.

#### Scenario: DqDocumentenBeheer

- **GIVEN** the documents of a case in the board look with one file ticked
- **THEN** the header row is near-white at 14px/600, the cells are 14px with 11px 12px of padding
- **AND** the ticked row keeps the white ground, and "Document" is a bare label, not a 34px button
- **AND** each row menu is a 34px square with a grey border

#### Scenario: DqZaakDocumenten review list

- **GIVEN** a file list with a visible "Beoordelen" button on its rows
- **THEN** the row menu beside it stays the bare three-dot button
