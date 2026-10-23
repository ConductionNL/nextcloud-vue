# Proposal: index-default-filters

## Why

DqContracten opens on the contracts that still run: the Active line reads "Status: actief en verlopend" with a remove
button and "Alles wissen". A quick filter is a tab, not a removable chip, and a `filter` cannot be removed at all.

## What changes

CnIndexPage takes `defaultFilters` (`{ field: value | [values] }`) on a register list (a named source keeps its own filter state and does not read them yet). When the address names no filter and no saved view,
the list opens with them as its active filters: they are fetched, shown on the Active line and removed with their chip
or "Clear all" like any filter the person set. An address that names a filter, or a saved view, wins. The chip text
follows the page's filter labels where it declares them (index-filter-labels).

## Scope

nextcloud-vue only. Page config is an open object in the manifest schema: no schema change. dossiq uses it on Contracts
(DQ-ADMIN).
