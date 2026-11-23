# index-sidebar Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-sort-note-reads-as-board](../../)

## ADDED Requirements

### Requirement: The board look writes the current order as the board does

In the board look the line under the sort direction SHALL read "Now: by {order}." with the field's label in lower case,
followed by "You save the order along with a view." The Nextcloud look SHALL keep "Current order: {order}".

#### Scenario: DqZakenSorteren

- GIVEN the Cases cards sorted by deadline, ascending, with the side panel open in Dutch
- THEN the line reads "Nu: op termijn, oplopend. De sortering bewaart u mee in een weergave."
