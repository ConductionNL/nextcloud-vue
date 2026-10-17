# Proposal: index-search-source

## Why

DqZoekresultaten shows one search term's results across cases, other objects and documents, with a quick filter per
kind and its count ("Alles 23, Zaken 9, Objecten 14, Documenten 6"). An index page could list one schema, or one named
source, but not search several.

## What changes

- A named index source `search`: `entitySource: "search"` with `sourceConfig.kinds`, each either
  `{ id, label, register, schema, titleField?, subtitleField?, statusField?, href?, limit? }` (searched with
  OpenRegister's `_search`, so the reader only sees what they may read) or `{ id, label, files: true, limit? }` (the
  reader's files through Nextcloud's unified search).
- The term is `sourceConfig.term`, else the address's `?q=` (or `sourceConfig.termQuery`).
- The kinds are searched in parallel. The source supplies the quick filters (All plus one per kind) and their counts
  (`tabCounts()`), default columns (result with a secondary line, kind, status) and opens a row at its `href`.
- A kind that fails shows no rows and no count; the others still answer. Without a term nothing is searched.
- `resolveIndexSource(name, config)` hands the page's `sourceConfig` to the source factory, so a source can build its
  tabs from it; existing sources ignore it. No manifest schema change.
