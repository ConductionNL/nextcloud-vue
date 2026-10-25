# A row menu fits in an edge-to-edge card table

## Why
DqZaakGerelateerd "Objecten" (r29): the row menu column is 66px for a 34px button between 16px paddings. In an edge-to-edge card table, the last column also takes the card's 22px end padding, which left the button 28px, and the card cut it off.

## What changes
In the board look, an actions column that is last in a bleed table grows by the card padding: 50px plus `--cn-board-card-inline-padding`. With the CSS injected on :8080 the column is 72px and the menu ends 23px inside the card. No schema change.
