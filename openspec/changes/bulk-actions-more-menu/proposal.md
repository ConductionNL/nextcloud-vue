# Proposal: bulk-actions-more-menu

## Why

The opencatalogi boards OcMassaActies, OcSamenvoegen and OcMigreren draw the
Publications selection bar with Publish and Withdraw as buttons and Lock,
Unlock, Validate, Merge and Migrate under More. CnActionsBar draws every
declared bulk action as a button, so a page with seven bulk actions gets seven
buttons and no way to put the rarer ones away.

## What changes

- A bulk action (`bulkActions[]`) with `menu: true` is listed under a More menu
  after the buttons, in the contextual selection strip and in the board look's
  bulk band. Its click emits the same `bulk-action` payload with the selection.
- Entries without `menu` render as before. No schema change: `$defs/action`
  already allows the key.
