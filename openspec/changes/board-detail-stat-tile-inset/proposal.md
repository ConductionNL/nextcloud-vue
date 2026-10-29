# Proposal: board-detail-stat-tile-inset

## Why

pl3 on :8080: the stat tiles on pipelinq's product and project pages (PqProduct "Op deals", PqProject "Voortgang") put
their label 41px down and 45px in, where the boards draw it 17px down and 19px in. The header-less card's 20px 22px
padding, the tile's own 18px 20px and its 2px hover border stacked. The dashboard already drops the cell's padding for a
board tile (board-stat-tile-inset); a detail page's body grid and band did not.

## What changes

In the board look, a stacked stat tile in a detail page's body grid or band is the card itself: the cell adds no
padding, the tile draws no border of its own and sits 16px 18px in. Side cards keep their own rule.
