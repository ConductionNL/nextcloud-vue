# A refused dialog option as the boards draw it

## Why
DqVolgendeStap (design-system main) draws a refused option (Hervatten, Archiveren, Heropenen) with the same dark
#828a95 edge as an idle one, on the #f5f6f8 sunken ground. r25b (24 Oct) measured the hairline (228,230,234) on
#f0f1f3.

## What changes
In the board look, a refused CnChoiceCards row takes `--color-border-maxcontrast` and `--cn-board-sunken-ground`.
The Nextcloud look is unchanged. No schema change.
