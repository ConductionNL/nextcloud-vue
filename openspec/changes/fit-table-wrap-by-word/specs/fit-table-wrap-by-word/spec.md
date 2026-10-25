# fit-table-wrap-by-word Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A wrapping column in a fitted table breaks between words

In a fitted CnDataTable a column with `cn-cell--wrap` SHALL wrap between words and SHALL break a word only when it is longer than the column.

#### Scenario: DqDoorlooptijd Prestaties per zaaktype

- **THEN** "Gem. werkelijk (dagen)" wraps over three lines and the head row is about 72px, as on the board
