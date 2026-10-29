# Proposal: index-row-inline-actions

## Why

pl4 on board PqWachtrij: every queue row ends in "In behandeling nemen" as a light-blue pill and an eye to view the
ticket. The index page draws a row's actions only in its menu (a three-dot button in the board look), and the queue's
`inlineActionCount: 2` only reaches the page header's actions, so the queue showed a menu per row.

## What changes

- CnRowActions takes `inline` (default 0): the first visible actions show as buttons beside the menu. The first is a
  tonal pill with its label; an action with `iconOnly: true` is its icon, named by its label. The menu holds the rest
  and is left out when nothing is left.
- CnIndexPage takes `rowInlineActions` (manifest `config.rowInlineActions`) and hands it to the row menu in the table,
  list, card and expandable-row views.
