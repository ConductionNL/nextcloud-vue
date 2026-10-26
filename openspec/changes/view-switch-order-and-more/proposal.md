# Proposal: view-switch-order-and-more

## Why

The team queue (DqTeamwachtrij) is a list. Its board draws the view switch as four segments, list first: list, cards,
board, map. Live draws five: table, cards, board, map and list, because the board look's switch always puts table,
cards, board and map first and adds every other offered mode after them. Users keep the table view (Ruben, 23 October
2026): it moves behind a "More views" menu, it is not removed.

## What changes

- In the board look, `viewSwitch` sets the segments AND their order. It may name `list` as well as table, cards, board
  and map. Without `viewSwitch` the switch keeps its fixed order.
- A mode the page offers that `viewSwitch` does not name is not dropped: it is listed in a "More views" menu after the
  segments, each entry with its icon and name. While such a mode is open, the menu trigger is pressed.
- The list segment in the board look uses the board's plain bullets icon, as the table segment does.

Schema: `viewSwitch` items (page config and query presets) may be `list`; version 2.152.0, renumber in the batch.
