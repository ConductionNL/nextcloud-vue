---
kind: code
---

# Proposal: tasks-source-sorts-on-server

## Summary

Board DqTaken heads its list with sortable columns, "Deadline" sorted ascending. A named source either sorted the
rows it held on the page (`sortsRows`, one fetch) or not at all, and the task inbox pages, so a page-side sort would
order only the 20 rows on screen. The inbox endpoint already sorts by deadline, priority and creation.

A named source may now declare `sortParam(key, order)`: the request parameters a column's order becomes, or null for
a column it cannot sort by. CnIndexPage keeps the header's order for such a source (seeded from the page's
`sortKey` / `sortOrder`), passes it to the load, and fetches again from page 1 when it changes. The tasks source
maps `dueAt` / `dueLabel`, `priority` / `priorityLabel` and `created` onto the inbox's `sort`, and marks its Priority
and Due columns sortable.

## Scope

- `src/composables/indexSources.js` (tasks `sortParam`, sortable columns), `src/components/CnIndexPage/useNamedSource.js`
  (`sort` option), `src/components/CnIndexPage/CnIndexPage.vue` (`namedSort` as a setup ref seeded from the props).
- No schema change.
