# Proposal: board-follow-in-meta-row

## Why

COMPDIFF r22 measured an extra 1120x28 row on every dossiq case board: the Follow control on a header row of its own
(board-follow-row). No case board draws that row. The case boards put the followers in the Betrokkenen tab ("Volgers"
card) and draw the header as two rows: the title with its actions, then the pills and the breadcrumb.

## What changes

In the board look the Follow control ends the meta row (pills, breadcrumb, meta, chips) instead of standing on a row
of its own. The header loses the third row (180px to 153px on DqZaak). The control keeps its count and the follower
management. Without the board look it stays beside the title. This replaces the board-follow-row requirement.
