# Proposal: board-kanban-column-chrome

## Why

DqWerkbord draws a kanban column's heading at the font's normal line height (18px for 15px), its count as a 16px
bubble with the figure at 700, and a cut column's "Toon 12 meer" as a dashed 13px button. Live the heading took
Nextcloud's 1.5 (22.5px), the count 400 at an 18px line (a 20px bubble), and the show-more button lost to Nextcloud's
`button:not(.button-vue)` rule (one class and an element outrank one class): borderless, primary-tinted, bold, 15px
(COMPDIFF r19: DqWerkbord column cards and "Toon 12 meer").

## What changes

- The board-look heading and count use `line-height: normal`; the count figure is 700.
- The show-more rules are scoped under `.cn-board-view`, so the dashed button shows in every look.
