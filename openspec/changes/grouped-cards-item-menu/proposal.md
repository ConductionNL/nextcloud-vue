# Proposal: grouped-cards-item-menu

## Why

Board DqZaaktype draws every task on the "Fasen en taken" card with one 34px "···" button ("Acties voor Volledigheid
toetsen"). DQ-ADMIN's per-task menus waited on learniq's grouped-cards per-card actions
(`feature/lq-abstract-lq3-grouped-cards-item-actions` 1d10a68a4d), which draw a card's actions as a row of buttons and
no longer merged cleanly onto development (the actions row above the groups, 24t1b).

## What changes

- This branch carries the learniq branch merged onto development (conflicts: the page heading and the actions row
  above the groups both kept), so it supersedes 1d10a68a4d in the queue.
- `CnActionButtons` takes `overflowOnly` (every collapsible action in the `···` menu, the trigger icon only) and
  `overflowAriaLabel`.
- `CnGroupedCardsWidget` takes `content.itemActionsMenu: true`: each card's `itemActions` go in one menu named
  "Actions for {title}", drawn in the board look as the row menu's 34px bordered square.

## Reach

Opt in. No schema change. Docs: cn-grouped-cards-widget.md, cn-action-buttons.md.
