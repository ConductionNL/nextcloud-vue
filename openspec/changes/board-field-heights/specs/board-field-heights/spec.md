# board-field-heights Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-field-heights](../../)

## Purpose

Board fields are as tall as the boards draw them.

## ADDED Requirements

### Requirement: Side panel fields and page filters are as tall as the boards draw them

In the board look a text field or single select in the index side panel SHALL be 40px tall, and one in a dashboard's
page filters 36px. A multiple select's search box SHALL keep its own height.

#### Scenario: DqZakenSorteren

- **GIVEN** the case list's side panel in the board look
- **THEN** "Sorteren op" is 40px tall

#### Scenario: DqProcesanalyse

- **GIVEN** the process analysis dashboard in the board look
- **THEN** "Filteren op zaaktype" is 36px tall
