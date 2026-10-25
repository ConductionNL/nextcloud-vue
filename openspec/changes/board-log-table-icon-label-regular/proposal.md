# A plain log's icon-and-name cell is regular

## Why

DqZaakContact draws the Kanaal column ("Mijn Zuiddrecht" with a globe) at 400, like every other cell of the contact log. The iconLabel cell sets 600.

## What changes

- Board look: in a table with `rowTitle: "text"` (a plain log) the icon label is 400. Other tables keep 600.
