# Proposal: index-held-default-filters

## Why

Ruben, 29 October: board and list views hide closed cases by default, also when a link names its own filters. DqWerkbord
opened from a link that names a case type and a team drew the closed case 2026-4878 in an "Elders" column, because
`defaultFilters` apply only when the address names no filter at all.

## What changes

CnIndexPage takes `heldDefaultFilters`, a list of `defaultFilters` keys. While the address names filters of its own,
those keys still join them, unless the address names the key itself. A saved view keeps its own filters. Without the
prop nothing changes. It holds on a register list, on a named source, and for `@config` defaults that arrive later.

## Scope

nextcloud-vue only. Page config is an open object in the manifest schema: no schema change. dossiq sets
`heldDefaultFilters: ["isFinalStatus"]` on its Cases page.
