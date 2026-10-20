# Proposal: board-matrix-cells

## Why

The boards set a matrix chart (DqProcesanalyse "Dagen per fase") at 14px: the column heads and the cell figures at 600,
the cells at the font's normal line height, 37px with their 10px padding. Live the matrix took Nextcloud's 15px at 1.5
and weight 400, so each cell was 42.5px (COMPDIFF r19: 12 cells on DqProcesanalyse, 3 to 4 flags each). Under thematiq,
which forces the body ink onto every span, the lightest cells also lost their primary ink and the darkest their white.

## What changes

- In the board look the matrix is 14px at the normal line height, heads and figures 600 (the highlighted cell keeps
  700).
- The column heads, level 1 and level 4 cells hand their ink to `--nldesign-color-on-surface`. Level 3 does not: white on its tint is below
  4.5:1, so under such a theme it keeps the body ink. (The board draws "14 d" white on #6f95c4, 3.2:1; not shipped.)
