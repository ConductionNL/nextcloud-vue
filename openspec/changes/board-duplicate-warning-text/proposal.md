# Proposal: board-duplicate-warning-text

## Why

r34 DqNieuweZaakDubbel: the warning note had no bold line, square corners (4) and the mixed legacy ground where the
board draws a 15px bold warning line at radius 8 on the status warning ground. The match card's title stood on a 22.5px
line with its facts at 15px beside it, where the board stacks them 3px apart at 13px, 12px 14px in; the small print
was 15px against the board's 13px, so the dialog's content ran 8px long.

## What changes

In a board dialog, CnDuplicateWarning's note, match card and small print take the board's sizes, ground and ink.
The Nextcloud look is unchanged.
