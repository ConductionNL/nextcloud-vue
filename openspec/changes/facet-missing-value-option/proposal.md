# Proposal: facet-missing-value-option

## Why

OpenRegister counts, per terms facet, how many objects in scope hold no value
for the property (`missing: { results }`, openregister#3768), and filters on it
with `<property>_isnull=true`. `normalizeFacets()` rebuilt each facet from its
buckets alone, so the count never reached a sidebar (issue #1176). "Twelve cases
have no result type" is a data quality answer nobody has to write, and it is
only useful if a person can click it.

## What Changes

- `normalizeFacets()` carries `missing`, `type` and `title` beside `values`.
- `CnIndexSidebar` and `CnFacetSidebar` offer one more option, "No value (12)",
  when some objects hold no value.
- `useListView` sends that option as `<property>_isnull=true`. The option is
  exclusive: combined with a value it would always answer an empty list.

Consumer: dossiq `case-search-declares-its-fields` task 7.1.
