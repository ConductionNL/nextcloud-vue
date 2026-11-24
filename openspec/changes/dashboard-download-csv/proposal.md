# Proposal: dashboard-download-csv

## Why

A report is a dashboard page, and the people who read it want its figures in a
spreadsheet. buildiq's two report pages (`operate-report-download`, REQ-BQREP-004)
declare `download: true` and `downloadName`, but the dashboard page had no such
option, so nothing was offered.

## What changes

`CnDashboardPage` takes `download` and `downloadName`. With `download` on, the
header shows "Download", disabled until the figures are read, which saves
`<downloadName>-<yyyy-mm-dd>.csv` (`widget,label,value`): a stat tile's count, a
grouped chart's count per group, an object table's records. The figures are
read with the same OpenRegister calls the widgets make (`src/utils/dashboardDownload.js`).
Without the flag nothing changes.
