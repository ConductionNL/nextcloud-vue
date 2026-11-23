# Proposal: data-table-local-headers

## Why

Boards PqBeheerKassa and PqBeheerMarketing draw the settings tables with a sort chevron and a filter funnel in every
head ("Actief ▾", "Standaard ▾"). Live's tables are plain: they hold every row from an app endpoint, and CnDataTable's
header sort and filter only emit, for a host that keeps the state and fetches again. A settings table has no such host.

## What changes

- CnDataTable `localHeaders` (Boolean, default false). The table keeps the header sort keys and the header filter map
  itself and applies them to the `rows` it was given (the shared `localHeaderRows`), with the same panels and chips.
  `sort` and `column-filter` still emit. `sortKey`, `sortKeys` and `activeFilters` are not read.

Without the prop nothing changes. No schema change.
