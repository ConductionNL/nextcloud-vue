# Proposal: board-choice-row-chosen-white

## Why

The Dq dialog boards drew a chosen option three ways (white, the primary tint, #f7f9fc). The majority, white with
the 2px primary edge, now holds on every Dq board (design-system #371). CnChoiceCards drew the chosen row and the
chosen option's details frame on the primary tint (COMPDIFF r24 DqDocumentGenereren: 247,249,252 vs 234,240,247).

## What changes

In the board look a chosen option row, and the frame that holds a chosen option's fields, keep the main background
under their 2px primary edge. The Nextcloud look keeps the tint.
