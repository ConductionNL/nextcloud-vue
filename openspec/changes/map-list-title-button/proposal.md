# Proposal: map-list-title-button

## Why

On DqZakenKaart each row of the map's numbered list drew its title as a 34px tinted pill: blue bold text on a light
blue fill with a 3px margin, the row 111px high against the board's 89. The title is a `button` (it opens the case)
styled to read as text with one class, and Nextcloud's own `button:not(.button-vue, ...)` rule (specificity 0,2,1)
outranks a single class.

## What changes

The title rule names the list and the row as well, which outranks Nextcloud's button rule, and resets the box
properties that rule sets (height, margin, padding, fill, radius). Hover and focus keep it as text; the focus outline
stays. Both looks get it: the pill was never intended in either.
