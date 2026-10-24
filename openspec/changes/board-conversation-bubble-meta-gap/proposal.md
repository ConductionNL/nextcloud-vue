# A board message's meta line: 13px, 6px above the text

## Why

DqZaakContact draws each message's meta line (author, channel, direction and
time) at 13px with 6px between it and the text. Live measured 13.5px (the
component's own 0.9em of 15px beat the board's 13px: same weight, and the
scoped rule loads later) and a 4px gap (r25b: gapBelowTitle 7.5 vs 10.5,
gap 4 vs 6).

## What changes

In the board look the meta line's 13px moves into the rule that names the
thread (which outranks the scoped one), and the bubble's gap is 6px.
