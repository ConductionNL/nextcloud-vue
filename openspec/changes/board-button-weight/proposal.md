# Proposal: board-button-weight

## Why

The boards draw a labelled button at weight 600. With the nldesign theme no longer forcing a weight on board-look
buttons, they fell back to Nextcloud's `--font-weight-element` (500): COMPDIFF r18 counts 211 buttons on 58 boards at
500 against the board's 600. In the default Nextcloud look an NcButton is 500 too, so the 600 is the board's own.

## What changes

In the board look each NcButton sets `--font-weight-element: 600`, the variable NcButton reads its weight from.
Breadcrumb buttons keep the crumb weight; a page in the Nextcloud look inside a board app is left alone. Measured live
(dossiq's queue): "Downloaden", "Acties", "Weergave opslaan" and "Filter" 500 → 600; the primary "Nieuwe zaak" stays
600.

## Scope

Board-only: Nextcloud's own weight for an NcButton is 500, and the default look keeps it.
