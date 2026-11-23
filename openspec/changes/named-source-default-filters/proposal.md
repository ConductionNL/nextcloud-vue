# Proposal: named-source-default-filters

## Why

Board DqTaken opens the tasks list on this month's deadlines, "Deadline: 1 tot en met 31 oktober", removable. The tasks
list is a named source, and `defaultFilters` (index-default-filters) only started a register list.

## What changes

A named-source page starts its sidebar filters from `defaultFilters` when the address names no filter and no saved view,
with their tokens resolved (`@monthStart`, `@monthEnd`, `@myGroups`). A range is `{ from, to }`, as the address's
`2026-10-01..2026-10-31` reads. From then on they are ordinary filters.
