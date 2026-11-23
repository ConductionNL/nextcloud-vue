# Proposal: workspace-filter-export-table

## Why

DqTermijnen draws the quarterly report form as one row: "Kwartaal (JJJJ-Qn)", "Rapport laden" and "CSV exporteren",
with the table under it. Live the export is the object table's own footer button, under the table. The form
(CnWorkspaceFilterWidget) and the table are separate widgets, so the table cannot place its export in the form.

## What changes

A workspace filter input takes `exportTable: { exportId, label? }`: a secondary button beside the load button that asks
the object table with that `exportId` for its rows as CSV (`cn:widget:export`, the request a page header Download
already makes). The table keeps `exportId` and drops its own `exportCsv` footer. In the board look the button is the
40px neutral control, 14px in.

## Scope

CnWorkspaceFilterWidget.vue, look-board.css. Opt-in; no schema change (workspace filter content is untyped).
