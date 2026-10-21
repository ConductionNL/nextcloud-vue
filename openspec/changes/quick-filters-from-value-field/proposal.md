# Proposal: quick-filters-from-value-field

## Why

portaliq's glossary board ([portaliq/PtBegrippen](https://identity.conduction.nl/screens/board?id=portaliq/PtBegrippen)) draws a pill per portal: "Alles 31 / Gemeente Zuiddrecht 24 / Mijn Zuiddrecht 7". A glossary term names its portal by slug, not by id, so `quickFiltersFrom` with `register`/`schema` cannot label the tabs: the resolver looks records up by id and the pills read `zuiddrecht`. The same holds for every child record that names its parent by a slug or code.

## What Changes

- `quickFiltersFrom.valueField`: with `register` and `schema`, the values are matched on that field of those records instead of their id, in one list request, and each tab reads the record's `labelField` (else title, else name). A value no record carries keeps its raw text.
- `src/utils/labelsByField.js`: the lookup, usable by other surfaces.

## Impact

- `src/components/CnIndexPage/CnIndexPage.vue`, `src/utils/labelsByField.js`; tests. Without `valueField` nothing changes.
