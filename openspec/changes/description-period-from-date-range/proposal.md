# Proposal: description-period-from-date-range

## Why

DqDashboard's description names the month it reports on and who it covers: "Hoe het team ervoor staat · oktober 2026,
alle teams waar u in zit". The dashboard's period is its date range (`dateRange`, default "Current month"), not a page
filter, so `{filter.<key>}` cannot name it, and a fixed month in the manifest would be wrong next month.

## What changes

A dashboard description may hold `{dateRange}`: it reads the dashboard's active date range as a period. A calendar
month preset reads as the month and year ("oktober 2026"), a calendar quarter as its months, a calendar year as the
year, any other preset as its translated label, and a custom range as its dates. The text follows the range when the
reader changes it.

## Scope

`utils/periodOptions.js` (`rangePeriodText`), CnDashboardPage's description. No schema change.
