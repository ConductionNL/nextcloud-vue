# Proposal: board-attention-flag-button-height

## Why

The case boards draw the attention flag's "Markeer voor aandacht" as a 40px button (DqZaak and 13 case tab boards).
CnAttentionFlagWidget renders it as NcButton at 34px (COMPDIFF r22 `h 40>34` on 14 boards, nc-vue 2.124).

## What changes

In the board look a labelled button in the attention flag takes the 40px control height.

## Scope

Board-only, `look-board-detail.css`.
