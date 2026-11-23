---
kind: code
---

# Proposal: named-source-header-filters

## Summary

Board DqTaken draws a filter funnel in its column headers, the one on Deadline marked active by the month's default
filter. The task list is a named source (the engine's inbox). It already filters on the server through the sidebar's
search fields (`sidebar.fields` mapped by the source's `searchFields`: case, state, priority, kind, deadline), but its
headers drew no funnel. Header filters existed only for schema-backed lists, and for sources that filter the rows they
hold (`headerFilters: true`).

A named source may now declare `headerFilters: "searchFields"`. A column then gets a funnel when the field it filters
on (`filterField`, else its key) is one of the page's declared search fields. The funnel's control comes from that
sidebar field: its enum and labels, a date range, or a reference to the objects in its `optionsSource`. Choosing writes
the same active filter the sidebar writes, so the chip, the sidebar, the address and the request all agree. A date
range is kept as the sidebar keeps it, as one `{ from, to }` value. A column with no search field behind it draws no
funnel; a funnel nothing could answer would only look like it filters.

## Scope

- `src/components/CnIndexPage/CnIndexPage.vue`:
  - header filters are on for such a source;
  - a filter schema is built from the sidebar fields;
  - columns that have no field are left out;
  - a `{ from, to }` value is shown as the funnel's range;
  - a header range is folded back into one value.
- `src/components/CnDataTable/CnDataTable.vue`: a `filterSchema` prop, which only the funnels read.
- `src/composables/indexSources.js`: the tasks source declares `headerFilters: "searchFields"`.
- No schema change.
