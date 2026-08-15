# Tasks: CnSearchPage + type='search'

- [x] Component + index + barrels + jsdoc-baselines (1.0).
- [x] defaultPageTypes adds `search: CnSearchPage`.
- [x] Schema enum gains `'search'`; version 2.5.0 → 2.6.0; description updated.
- [x] 14 tests (query lifecycle, facets toggle multi/single, clearFacets, results, result-click, empty/idle/loading, totalCount footer).
- [x] Docs page.
- [x] openspec change docs.

## Follow-up

- [x] URL serialization of `?q=…&facet=…`. [DEFERRED: cross-cutting URL contract — pushed to a separate `cn-search-url-state` change; needs router peer + back-button semantics design.]
- [x] Highlighted query terms in snippets. [DEFERRED: depends on consumer-side snippet builder; deferred to consumer-app PRs that need it (opencatalogi search).]
- [x] Type-ahead suggestions API. [DEFERRED: needs a documented suggestions endpoint contract; separate follow-up change.]
