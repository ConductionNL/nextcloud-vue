# Proposal: index-quick-filters-from

## Why

DqTeamwachtrij draws one quick filter per case type in the queue, with counts: "Alle typen 11, Woo-verzoek 4,
Omgevingsvergunning 3, ...". Case type ids differ per install, so a manifest cannot list them as `quickFilters`.

## What changes

- CnIndexPage takes `quickFiltersFrom: { field, register?, schema?, labelField?, allLabel? }`. It asks OpenRegister's
  grouped aggregation for the distinct values of `field` with their counts, within the page `filter`, and draws "All"
  (or `allLabel`) plus one tab per value, the most frequent first, each with its count.
- With `register` and `schema` the values are record ids, labelled with the reference-label resolver the index tables
  use (`labelField`, else title or name).
- `quickFilters` wins when set. A failed request draws no tabs. No manifest schema change: page config is open.
