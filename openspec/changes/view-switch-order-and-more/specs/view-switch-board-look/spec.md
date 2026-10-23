# view-switch-board-look Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [view-switch-order-and-more](../../)

## ADDED Requirements

### Requirement: viewSwitch sets the segments and their order, the other views go under More views

In the board look, when `viewSwitch` is given the view switch SHALL draw the named modes as segments in the order named,
`list` included. Every other mode the page offers SHALL be listed in a "More views" menu after the segments, with its icon
and name; choosing it SHALL open that view, and while it is open the menu trigger SHALL read as pressed. Without
`viewSwitch` the switch SHALL keep its fixed order.

#### Scenario: DqTeamwachtrij

- GIVEN the team queue view offers list, table, cards, board and map, with `viewSwitch` ["list", "cards", "board", "map"]
- THEN the switch draws list, cards, board and map, list pressed
- AND "More views" lists Table
