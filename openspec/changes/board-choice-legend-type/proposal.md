# A board dialog's choice legend in the board type

## Why

The dialog boards set a choice legend ("Sjabloon" in DqDocumentGenereren) at
14px, weight 600, on the normal line height. Live draws it bold at the body
size on the body line height, so the first choice starts lower than drawn.
The header-to-body gap itself is fix/board-dialog-header-body-gap.

## What changes

- In a board dialog, `.cn-choice-cards__legend` is 14px/600 with
  `line-height: normal`. The Nextcloud look and dialogs outside the board
  look are unchanged.
