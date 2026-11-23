# Proposal: board-table-head-theme

## Why

The boards draw a table's header row at weight 600 on a near-white ground with muted labels (DqZaken, DqContacten,
DqTaken; COMPDIFF F049, F017, F019). The nldesign theme paints every `th` with `!important` through its table header
tokens, and the sort button inside it through its button weight token, so the live labels drew bold (700) and the
board look's ground, ink and weight never reached the cell.

## What changes

In the board look a table header cell sets the theme's table header tokens (ground, ink, weight 600) and its button
weight token (600) to the board's values. The theme's own rules then draw the board's header.

The remaining difference in ink and ground comes from the theme's palette: under the Zuiddrecht theme
`--color-text-maxcontrast` is the body ink and `--color-background-hover` is darker than the boards', so the muted ink
and the near-white ground follow the theme. That belongs to the theme, not the look.
