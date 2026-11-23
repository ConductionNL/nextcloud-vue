# A dashboard row that clears the rows above

## Why
The boards draw a row of cards under the tracks as one row: DqMijnWerk "Zaken die u volgt" and "Mijn archiefbeoordelingen" under both My tasks and Recent activity, DqMijnTeam "Zaken per status" and "Zaken per type" level under the cards above. Measured to their content, the cards above differ in height, so each card of the next row rose (or stayed) under its own column (r34: -189.8, -23.8, -28 px).

## What changes
- A layout item `clear: true` starts below the lowest card that starts on an earlier layout row, in any column (`planClearRows`). The grid places clear items after it is built and after every cell is measured to its content, and holds them (`gs-locked`) outside edit mode so the packing does not lift them.
- Schema: widgetEntry gains `clear`.
