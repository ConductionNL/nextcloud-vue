# board-list-trail-pill-ellipsis Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-list-trail-pill-ellipsis](../../)

## ADDED Requirements

### Requirement: A pill in a list row's trailing cell stays inside the cell

In the board look a status pill in a CnObjectRow trailing cell SHALL be no wider than the cell and SHALL end in an
ellipsis when its text does not fit. The Nextcloud look SHALL be unchanged.

#### Scenario: DqTeamwachtrij

- GIVEN a case of type "Kenteken wijzigen parkeervergunning" in a 200px type cell
- THEN the pill reads "Kenteken wijzigen parkeerve…" and does not cover the deadline beside it
