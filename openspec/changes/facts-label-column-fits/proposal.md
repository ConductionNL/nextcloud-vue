# The facts label column fits its labels

## Why
Nextcloud core gives every `dt` `width: 130px`. In the facts widget that made the label column 130px wide whatever the
labels say. DqZaak "Prioriteit" (r25b) put its values 44px right of the board, and the side "Behandeling" card did the same.

## What changes
The facts label resets `width` to auto, beside the margin, padding and alignment it already resets. With the CSS
injected on :8080, the values sit 125px (Prioriteit) and 120px (Behandeling) from the card edge, against the board's 125 and 118.
No schema change.
