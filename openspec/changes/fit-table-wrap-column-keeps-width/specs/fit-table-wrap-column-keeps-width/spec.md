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
