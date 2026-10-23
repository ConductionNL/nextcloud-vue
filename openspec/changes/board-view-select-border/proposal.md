# The board view's selects take the board control border

## Why

The board draws the board view's "Zaaktype:" and "Kolommen:" selects with the
board control border (#828a95, DqWerkbord). Live drew the light border (COMPDIFF
r24 borderColor 130,138,149>228,230,234): the nldesign theme sets every
`select`'s border colour with `!important` from
`--nldesign-component-form-select-border-color`, which outranks
`.cn-index-page__board-select`'s own border.

## What changes

In the board look `.cn-index-page__board-select` hands that token, and its
own border colour, `--cn-board-control-border`. The default look is unchanged.
