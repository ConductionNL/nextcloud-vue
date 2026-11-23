# board-menu-tree-rows

## Why

dossiq's Catalogue page (board dossiq/DqCatalogus) shows its folders as a tree menu on a card. In the board look the
rows drew as underlined links in the theme's link colour, flush with no padding or corner, at 14px with an empty caret
column in front, and the open folder had no highlight: the widget's highlight rule is scoped and never reached the rows,
which belong to a child component. The board draws folder rows: 8px 10px, an 8px corner, 15px, 2px apart, 14px inside
the card, the open folder on the primary tint in the deep primary at 700.

## What changes

In the board look a tree menu draws the board's folder rows, its labels keep the row's ink without an underline under
a theme, the caret column is left out when no row has children, and the open row takes the background highlight. The
Nextcloud look is unchanged.
