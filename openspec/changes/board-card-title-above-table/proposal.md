# A card title 12px over a table

## Why
A board dashboard card's header ends 12px minus the first line's leading allowance (0.15em) above its content. A table's head row has its own box, so the three Doorlooptijd tables stood 2.2px too close under their titles (r34 gapBelowTitle 19.8 vs 22).

## What changes
Over an object table (`.cn-widget-object-table__host` directly in the card's content) the header ends a full 12px above it.
