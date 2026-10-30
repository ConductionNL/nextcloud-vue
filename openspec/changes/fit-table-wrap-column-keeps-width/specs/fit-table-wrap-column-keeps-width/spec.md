# fit-table-wrap-column-keeps-width Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A wrapping growing column keeps a readable width

In a fitted CnDataTable, a growing column with `cn-cell--wrap` SHALL wrap its text and SHALL keep a minimum width of
8em. A growing column without it SHALL keep the one-line ellipsis.

#### Scenario: DqDoorlooptijd Zaken met risico

- **GIVEN** the title column declares `cellClass: "cn-cell--wrap"`
- **THEN** it is at least 8em wide and its titles wrap

### Requirement: A reorderable row's name keeps its words whole

In a CnDataTable with a reorder grip, the name beside the grip SHALL sit 26px in, and the column SHALL be at least as
wide as the grip plus the name's longest word, so a name wraps between words only.

#### Scenario: DqZaaktypeVelden

- **GIVEN** the case type's fields table, reorderable, in a card narrower than the table
- **THEN** "Welstandsgebied" and "Situatietekening" stay on one line, 38px in from the cell edge
