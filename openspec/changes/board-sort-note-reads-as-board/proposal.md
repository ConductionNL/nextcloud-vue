# Proposal: board-sort-note-reads-as-board

## Why

Board DqZakenSorteren writes the order under the sort direction as "Nu: op termijn, oplopend. De sortering bewaart u
mee in een weergave." Live wrote "Huidige volgorde: Termijn, oplopend", without saying that a saved view keeps it.

## What changes

In the board look CnIndexSidebar's current-order line reads "Now: by {order}." with the field in lower case, followed by
"You save the order along with a view." (nl "Nu: op {order}." / "De sortering bewaart u mee in een weergave."). The
Nextcloud look keeps "Current order: {order}". Two new l10n keys, en and nl. No schema change.
