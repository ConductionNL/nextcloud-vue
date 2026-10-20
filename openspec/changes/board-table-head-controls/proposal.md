# Proposal: board-table-head-controls

## Why

The boards draw a table header's sort control as the bare label, with no box round it, and the filter funnel after it
as a 22px button with a 4px radius (DqZaken, DqKlachten, DqWooVerzoeken). Live both took the 8px element radius from
the table's own rule (`var(--border-radius)`) and Nextcloud's `button` rule, so COMPDIFF read every sort control as a
pill and every funnel as 8px (r19: 22 failing items on three boards).

## What changes

In the board look the header sort button has radius 0 and the funnel radius 4px. Plain Nextcloud keeps its radius.
