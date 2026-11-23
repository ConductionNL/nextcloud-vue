# index-named-source-export Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-named-source-export](../../)

## Purpose

A list on a named or endpoint source can be downloaded like a list of OpenRegister objects.

## ADDED Requirements

### Requirement: A named-source list downloads its rows

An index page whose rows come from a named or endpoint source SHALL draw its declared Export header button. Without a
`run` or a `@mass-export` listener, activating it SHALL download the rows the source holds for the current query as a
CSV file with one column per table column headed by its label; cells SHALL be quoted per RFC 4180 and a cell starting
with `=`, `+`, `-` or `@` SHALL be prefixed with `'`.

#### Scenario: DqTaken

- **GIVEN** the Tasks page on the `tasks` source with an Export header button
- **THEN** "Downloaden" is drawn, and activating it downloads `taken.csv` with the visible columns and every listed task
