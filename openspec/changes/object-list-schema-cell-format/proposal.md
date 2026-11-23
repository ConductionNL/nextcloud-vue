# Proposal: object-list-schema-cell-format

## Why

When a manifest names an object list's columns with their own labels, CnObjectListWidget never loads the list's
schema, and CnDataTable is given no `:schema`. The cells then lose the schema's presentation: dossiq's contact moments
printed the stored `phone` and `2026-09-10T08:05:00+00:00` where an index table over the same schema shows "Telefoon"
and a date.

## What changes

A column on a top-level key takes the schema property's `format` and its `enum` with the `enumLabels` /
`x-enum-labels`, unless it states its own `format`, `enum`, `widget` or `formatter`. The schema is loaded when a column
needs it for its heading or for this presentation; a widget whose columns state both, or read dotted paths, still makes
no request. Concurrent schema requests for the same list are shared, and an answer for a list that was retargeted in
the meantime is dropped.

## Scope

nextcloud-vue only. The schema is not handed to CnDataTable as `:schema`, which would also make every column sortable.
