# Board choice rows: line height, icon and field indent

## Why
DqVolgendeStap (r26a, 24 Oct) drew each option row 70px high against the board's 60. The title and the description ran at
line height 1.5, and the board draws 1.2. The option's icon sat 13px below the title line instead of on it. The chosen
option's fields started at the radio (44px in) instead of under the option's text (76px in). Together these made the
dialog 86px taller than the board.

## What changes
In the board look: CnChoiceCards title and description at line height 1.2; the icon aligned to the top of the row; and,
for a chosen option with an icon, the details padded 76px at the start. With the CSS injected on :8080: rows 62, fields at
the text's x (501), icon on the title line. No schema change.
