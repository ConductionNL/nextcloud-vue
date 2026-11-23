---
kind: code
---

# Proposal: screens-quick-filter-sort

## Summary

On board DcVergaderingen the Komende lens reads soonest first, and Afgerond reads newest first. A page has one order
(`sortKey`/`sortOrder`), so one of the two lenses was always upside down. A quick filter can now set its own order
with `sort: { key, order }`.

## Scope

- `src/components/CnIndexPage/useSelfFetchList.js`: `quickFilterSortKeys`, the initial order and the order on a
  lens switch.
- `src/components/CnIndexPage/CnIndexPage.vue`: the `quickFilters` prop doc.
- No schema change: the v2 page config is open, and `quickFilters` items are not declared in it.
