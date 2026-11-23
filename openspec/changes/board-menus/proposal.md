# Proposal: board-menus

## Why

COMPDIFF r19 on DqZaakMeer counts 16 failing components in the open "Meer" menu of a case: the menu card (271px
wide, no border, no shadow, 4px in) and 15 rows (58px when a label wraps, square, flush left, 15px at 500). The board
draws a 344px card with a hairline, a 10px radius and a drop shadow, rows of 36px, 10px in, 6px rounded, 14px at 400.
None of the board-look rules reached the menu: NcActions opens it in a popover on `<body>`, outside the
`.cn-look-board` root. The "beheerder" tag after an admin entry never showed either: its rule keyed on the button,
while NcActionButton puts the attribute on its `<li>`.

## What changes

- The board menu rules key on `body:has(.cn-look-board)`: card chrome, rows, 18px icons, captions in 12px bold
  capitals, separators. NcActionButton's 220px label cap goes, so a long action stays on one line.
- A detail page's header menu is 344px wide and opens end-aligned under "Meer" (`CnActionsMenu` takes a
  `placement`), as the board draws it.
- The admin tag rule keys on `li[data-cn-admin-tag]`.

## Scope

Board-only: every menu rule needs a board-look root on the page. The admin tag shows only where CnDetailPage sets the
attribute, which it does only in the board look.
