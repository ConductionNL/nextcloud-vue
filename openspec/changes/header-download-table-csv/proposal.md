# Proposal: header-download-table-csv

## Why

Board DqCatalogus draws "Downloaden" in the page header over the object types table. A dashboard page had no way to
let a header action download a table on it: the table's own CSV export is a button under the table, and the `export`
action only opened the mass export dialog of an index page.

## What changes

An object table takes an `exportId`. An `export` action that names an `exportId` asks that table to download its rows
as CSV (event `cn:widget:export`), so a page header's Download downloads the table. Without `exportId` both behave as
before.
