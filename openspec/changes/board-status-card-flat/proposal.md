# Proposal: board-status-card-flat

## Why

COMPDIFF r22 measured the Status card on 14 dossiq case boards with `content.gapBelowTitle` 248 against the board's 10.
The board draws the status lines on the card itself: the status in bold ink, the time in it small and muted, then a
hairline and the attention flag. Live wraps the status explainer in a grey, rounded, padded box that the board does
not draw.

## What changes

In the board look the status explainer is flat (no ground, radius or padding). Its explanation line reads as the
board's status line (15px, bold, main ink) and its dwell line is 13px and muted, unless the dwell is breached. An
attention flag inside a detail sections card sits under a hairline with 10px above its heading. The Nextcloud look is
unchanged.
