# The parties "accepts" strip in the board look

## Why
DqZaakBetrokkenen (design-system #426) draws "Dit zaaktype accepteert" as a sunken strip, rounded at 8px, with a 14px bold label and outlined 13px chips. r26c measured radius 12, ground #f0f1f3 and the label 15/600.

## What changes
This is board-look CSS on CnObjectPartiesWidget's accepted strip: radius 8, `--cn-board-sunken-ground`, padding 8px 12px, gap 6px 8px, the label 14/700 at 1.2, and chips with a maxcontrast edge at 13/600. With the CSS injected on :8080 it reads 8px, #f5f6f8, 14px/700/16.8. No schema change.
