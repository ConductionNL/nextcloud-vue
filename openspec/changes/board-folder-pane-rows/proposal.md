# board-folder-pane-rows

## Why

The folder pane on dossiq's Departments page (board dossiq/DqAfdelingen) drew its rows as bold 15px buttons with a
folder icon, flush and unpadded, each level indented outside the row so a highlight stopped short of the pane's edge,
and the open folder on the light tint in the main ink. The board draws them as folder rows, the treatment
board-menu-tree-rows gives a tree menu: 8px 10px, an 8px corner, 14px at 400 without an icon, 18px further in per level
inside the row, the open folder on the primary tint in the deep primary at 700.

## What changes

In the board look the folder pane's rows (and its "All" row) are the board's folder rows. The weight also goes through
the nldesign button token, which forced 700 on every row. The Nextcloud look is unchanged.
