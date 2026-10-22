# Proposal: menu-item-counts

## Why

DqCatalogus draws a count beside each folder: Zaaktypen 14, Attributen 62, Sjablonen 23, Objecttypen 7. A menu item has
no count.

## What changes

A menu item takes `countFrom`: `{ register, schema, filter? }` reads the schema's total with one row asked; `{ url,
responsePath? }` reads an endpoint and counts its rows, or takes its `total`. The tree draws the count at the end of the
row. A failed read draws no count.

## Scope

nextcloud-vue only. Widget content is not validated per key: no schema change. dossiq uses it on the Catalogue page
(DQ-ADMIN). Built next to `childrenFrom` (menu-children-from-facet).
