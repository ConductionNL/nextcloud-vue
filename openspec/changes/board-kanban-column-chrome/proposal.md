# Proposal: board-kanban-column-chrome

## Why

DqWerkbord draws a kanban column's heading at the font's normal line height (18px for 15px) and a cut column's
"Toon 12 meer" as a dashed 13px button. Live the heading took Nextcloud's 1.5 (22.5px), and the show-more button lost
to Nextcloud's `button:not(.button-vue)` rule (one class and an element outrank one class): borderless, primary-tinted, bold, 15px
(COMPDIFF r19: DqWerkbord column cards and "Toon 12 meer").

## What changes

- The board-look heading uses `line-height: normal`. The count keeps board-pill-tones' 14px line at 700.
- The show-more rules are scoped under `.cn-board-view`, so the dashed button shows in every look.
