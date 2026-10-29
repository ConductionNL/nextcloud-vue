# A filter menu entry needs no column

## Why

The board Filter menu (`filterMenu`) lists only enum and badge columns, and prints each value raw. PqContracten filters on "Eigenaar: Pieter Jansen" while the board draws no owner column, and PqFlows has a Filter button on the flow's owner; neither could be built (TOOL-3, pl3). Values such as a user id read as the id.

## What changes

- CnIndexPage `filterMenuFields` (manifest `config.filterMenuFields`): `[{ key, label?, values?, referenceType? }]`, entries with no column behind them. Values: the entry's own, else the schema enum or options, else the API facet buckets, else the named source's `facets()`.
- The Filter menu names each value as the Active chip does (`activeFilterValueLabel`). A user field (schema `referenceType` or the entry's) reads by display name.
- The `flows` named source takes an `owner` argument (`searchFields`), narrows its rows to the chosen owners within the tab, and counts its owners in `facets()`.
