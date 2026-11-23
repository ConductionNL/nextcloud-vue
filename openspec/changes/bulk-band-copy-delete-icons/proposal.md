# Proposal: bulk-band-copy-delete-icons

## Why

PqTicketsSelectie draws the bulk band's "Selectie kopiëren" and "Selectie verwijderen" with an icon before the label,
and "Selectie verwijderen" in the error ink (#a30000), as HmAgents and SkApplicaties draw their Verwijderen. Live the
band's built-in Copy selected and Delete selected are text only in the ink (pl5: PqTicketsSelectie 4, 5). The strip
outside the board look and the overflow menu already draw both icons.

## What changes

In the bulk band, Copy selected draws ContentCopy and Delete selected TrashCanOutline (16px, as the band's declared
actions), and Delete selected reads in the error tag ink.

## Scope

`CnActionsBar.vue` band, `look-board-index.css`. No schema change.
