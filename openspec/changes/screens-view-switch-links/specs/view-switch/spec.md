# view-switch Delta: screens-view-switch-links

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-view-switch-links](../../)

## Purpose

One view switch can hold views that switch in place and views that are a page of their own.

## ADDED Requirements

### Requirement: A view switch segment can open another page

Under the board look, a mode named in `viewSwitchLinks` that the page does not open in place SHALL be drawn in the
view switch as a link to the configured route or href, in the fixed order of the switch and in the same box as the
other segments. It SHALL NOT be drawn pressed or disabled. A mode the page opens in place SHALL stay a button.

#### Scenario: The board is a page of its own

- **GIVEN** an index page with table and cards, `viewSwitch` ["table", "cards", "board", "map"] and `viewSwitchLinks` `{ board: { route: "CaseBoard" } }`
- **WHEN** the toolbar renders
- **THEN** the switch shows table, cards, board and map; Board is a link to the CaseBoard page and Map is disabled

#### Scenario: Without the key

- **WHEN** `viewSwitchLinks` is absent
- **THEN** the switch renders as before
