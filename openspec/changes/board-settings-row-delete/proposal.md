# Proposal: board-settings-row-delete

## Why

COMPDIFF pl3 PqBeheer and PqBeheerKassa: a row's "Verwijderen" on a settings card rendered as NcButton's filled red error
button. The boards draw a delete that does not shout: the soft error tint with red text in a list row an app draws itself
(PqBeheer category, skill and profile rows), and white with a red edge and red text in a settings table row (PqBeheerKassa
payment methods, DqTokens).

## What changes

- In the board look an error button inside `cn-settings-row-actions` on a settings card draws the soft error tint, red text,
  no edge.
- In the board look an error button in a table cell on a settings card draws white with a 1px red edge and red text.
- The tint is derived from the theme's `--color-error` (`--cn-board-error-tint`), so a theme that changes the error colour
  changes the tint.
