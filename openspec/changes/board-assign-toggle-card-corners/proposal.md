# Proposal: board-assign-toggle-card-corners

## Why

After the toggle card was made tight (24t1p), compdiff r26c pairs DqOverdragen's "Verzoeker informeren" card and reads
three differences: corners 12px on live for the board's 8px, the label on a 22.5px line for the board's 18px, and so
the label 2.8px lower (titleInsetTop 15.8 vs 13).

## What changes

In a board dialog, CnAssignDialog's toggle card takes 8px corners and its label an 18px line.

## Follow-up (r29)

On :8080 the rule tied with CnAssignDialog's scoped `.cn-assign-dialog__toggle[data-v-…]` (class + attribute), which
loads later and won: the card kept 12px 14px padding and 12px corners (r29: radius 12 vs 8, titleInsetTop 15.8 vs 13).
The selector takes `.dialog` so it outranks the scoped rule whatever the load order.
