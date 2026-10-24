# saved-views Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-save-view-only-when-changed](../../)

## ADDED Requirements

### Requirement: The board look offers Save view once the view has changed

In the board look the toolbar's Save view SHALL show only after the reader changed the view (filters, search, order,
columns, quick filters, board narrowing or column field) and SHALL go away when a saved view is opened or the view is
saved. The Nextcloud look SHALL keep the button.

#### Scenario: DqTeamwachtrij

- GIVEN the team queue as it opens
- THEN the toolbar holds the type chips, Filter and the view switch, and no Weergave opslaan

#### Scenario: DqZaken

- GIVEN the reader sets the team and status filters
- THEN Weergave opslaan shows
