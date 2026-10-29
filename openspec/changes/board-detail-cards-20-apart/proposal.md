# Proposal: board-detail-cards-20-apart

## Why

COMPDIFF r35 DqHandhaving "De overtreding": y +5 under the LHS matrix card. The boards draw 20px between stacked
detail cards; the body grid keeps 12px on every side of each item, so two stacked cards stood 24px apart. 1px rows
for size-to-content cells (fix/r33-detail-grid-fit-rows) removed the rounding, not this gap.

## What changes

- CnDashboardGrid takes `marginBottom` (pixels, default null): the margin under each item in place of `margin` on
  that side only.
- CnDetailPage passes 8 in the board look, so its body cards stand 12 + 8 = 20px apart. Without the look nothing
  changes.

## Impact

Every board-look detail page with stacked body cards: each card under another moves 4px up per card above it, and a
card on fixed rows gets 4px more room at its foot. Probed on :8080 (DqHandhaving): "De overtreding" 797 -> 793,
board 792.
