# Proposal: board-kanban-show-more

## Why

DqWerkbord draws a kanban column's "Toon 12 meer" in the soft ink (#3d4047), its dashed edge in the 3:1 control colour
(#828a95), 6px in at the sides. The board view draws it in the main ink, 12px in, edged in `--color-border-dark`,
which plain Nextcloud draws at 1.4:1 against white. COMPDIFF r21: `paddingLeft 6>12`, `color 61,64,71>27,28,29`.

## What changes

In the board look the show-more button takes the soft ink, the control edge colour (still dashed) and 6px side padding.

## Scope

Board-only, `look-board-index.css`. Contrast: the soft ink is above 4.5:1 on the column ground.
