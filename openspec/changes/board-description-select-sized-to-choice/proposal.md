# Proposal: board-description-select-sized-to-choice

## Why

COMPDIFF r31, DqDoorlooptijd "Filteren op zaaktype": the select on the description line was 246px wide against 135px
drawn, in 15px/400 against the board's 14px/500. `board-description-select-compact` lifted NcSelect's 260px minimum, but
the search input still took its default 20-character width.

## What changes

In the board look only, a description-line select sizes its search input to its content (`field-sizing: content`), pads
it 10px with room for the open indicator, and sets its text in 14px/500. The Nextcloud look is unchanged.
