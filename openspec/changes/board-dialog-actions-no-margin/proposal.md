# A board dialog's footer has no margin

## Why
r30 measured the DqVolgendeStap dialog's footer 30px low. 6px of that is NcDialog's scoped `.dialog__actions` margin (6px 0 12px). It has the same specificity as the board rule that sets `margin: 0`, and wins because it loads later.

## What changes
A more specific board rule sets the footer's margin to 0. No markup change, no schema change.
