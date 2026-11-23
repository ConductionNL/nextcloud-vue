# An applied saved view puts no chip for its own filters

## Why

DqFilterBeheren draws the applied view "Wacht op inwoner" with no chip for its defining filter. Live added "Wacht op inwoner: true".

## What changes

The Active line leaves out a filter value the applied saved view itself sets (`query.filters`). A filter the reader adds, or a value that differs from the view's, keeps its chip.
