# Proposal: expandable-row-table-tools

## Why

Board PqPipelines draws the open pipeline's stage table with a sort chevron and a "Filteren op ..." button on every column header, and a drag handle before every stage. The expandable row drew plain headers and no handle, so the order of stages could only be changed in the pipeline's form.

## What changes

- CnExpandableRow: `table.sortable` puts a sort button on each column header (ascending, descending, off; `aria-sort` on the header). `table.filterable` puts a filter button on each header that opens a list of the values the column holds; checking values keeps only the entries with them. A column opts out with `sortable: false` / `filterable: false`.
- CnExpandableRow: `table.reorder: { key? }` draws a drag handle per entry. Dragging a row, or the arrow keys on its handle, emits `reorder` with the list in its new order and `key` (default `order`) renumbered from 1. Moving is off while the table is sorted or filtered.
- CnIndexPage saves a reorder (a PATCH of the list field through the page's own store in self-fetch mode, else the `store` prop), reloads, and emits `reorder`.
- Schema: `expandableRows.table.sortable`, `.filterable`, `.reorder.key`, `columns[].sortable`, `columns[].filterable`.
