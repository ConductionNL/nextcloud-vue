# Proposal: board-title-secondary-normal-leading

## Why

Under the board look a title column's secondary line ran at a normal line height, 2px under the title, only in a column marked to wrap (`cn-cell--wrap`). A title column wraps wherever it is narrow: on DqFilterBeheren, beside the open sidebar, "2026-4837 · Linda Bakker" runs over three lines at the table's 1.35 (18.9px), so each row came out 2 to 4px taller than drawn and the pager sat 23px low after ten rows.

## What changes

- Every board-look title column's secondary line runs at a normal line height, 2px under the title. On one line that is 18.8px, the 18.9px it had.
- No manifest or prop change.
