# board-list-toolbar-kpi-chips Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-list-toolbar-kpi-chips](../../)

## ADDED Requirements

### Requirement: The board list keeps its toolbar, stat and chip sizes

In the board look the actions bar SHALL keep 8px between items and between wrapped lines of row 1, with the search row 20px under row 1; a stat card in the index widget row SHALL be the wrapper's edge and 18px inset without a border of its own; the team-today initials SHALL take the board's soft ink; and a card footer's initials SHALL be 12px.

#### Scenario: DqZakenSorteren

- GIVEN the case cards with the side panel open
- THEN the view switch stands 8px under the chips and the search field 20px under the view switch

#### Scenario: DqTeamwachtrij

- GIVEN the team queue's three stat cards
- THEN each is 110px tall with its label 19px under the top
