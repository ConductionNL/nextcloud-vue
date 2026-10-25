# index-sidebar Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-sidebar-search-reads-as-board](../../)

## ADDED Requirements

### Requirement: The board look's side panel search is named by the list's search hint

CnIndexPage SHALL hand the index sidebar the list's search placeholder unless `sidebar.search` sets one. In the board
look the sidebar's search field SHALL be named by that placeholder and SHALL carry a magnifier icon. The Nextcloud look
SHALL keep the "Search" label.

#### Scenario: DqZakenSorteren

- GIVEN the Cases cards with the side panel open
- THEN the Zoeken tab's field shows a magnifier and "Zoek op zaak, nummer of verzoeker"
