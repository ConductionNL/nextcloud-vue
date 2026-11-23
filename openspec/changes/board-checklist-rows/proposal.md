---
kind: code
---

# Proposal: board-checklist-rows

## Summary

Board DqTaak draws the checklist as follows:

- an 18px box at the card's 23px inset;
- the label 12px after it, in weight 600;
- 12px between items.

The r25b measurement of live:

- the first-row inset is 30 against 23, because Nextcloud's checkbox pads its box 7px in;
- every row is 34px tall;
- the labels are weight 500.

In the board look, the checklist rows take the board's geometry, which a live probe confirmed with the CSS injected:

- box at 23;
- label at 53, in weight 600;
- a 32px pitch;
- the label top 32px under the title.

## Scope

- `src/css/look-board-detail.css`.
- The Nextcloud look is unchanged, and there is no schema change.
