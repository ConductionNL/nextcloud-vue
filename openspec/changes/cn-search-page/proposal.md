# type='search' page type + CnSearchPage

## Why

The opencatalogi triage flagged `SearchIndexView` as a custom because no lib page-type covers cross-schema search with facets. The shape recurs anywhere multi-entity full-text search surfaces.

## What

- `src/components/CnSearchPage/CnSearchPage.vue` (~430 LOC) — query input + facet sidebar + results list + state-aware empty/idle/loading messages. Emits `@search` (combined query+facets), `@query-change` / `update:query` (v-model), `@facets-change`, `@result-click`.
- `defaultPageTypes` adds `search: CnSearchPage`.
- v2 schema `pages[].type` enum gains `"search"`; schema version → 2.6.0.

The widget owns the UI; the consumer wires the actual search backend in the `@search` handler.

## Non-goals

- Full-text indexing — consumer-side (Elastic, Postgres ts_vector, OR `_search`, etc.).
- Facet aggregation — consumer computes counts before passing.
- Saved searches / URL serialization.
- Type-ahead suggestions.

## References

- [nextcloud-vue#289](https://github.com/ConductionNL/nextcloud-vue/issues/289).
- opencatalogi `SearchIndexView`.
