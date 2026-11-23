---
kind: code
---

# Proposal: screens-column-hidden-by-default

## Summary

A column object can say `hidden: true` (documented in the manifest schema: "hidden by default; users can re-enable it
from the columns sidebar tab"). The index page ignored it when the person had no saved column set: the self-fetching
page seeded its visible set with every declared key, and the table never read the flag. decidiq's meetings page
(board DcVergaderingen) declares columns it keeps out of the default table, and they rendered.

A declared column with `hidden: true` now starts outside the visible set, and the table leaves it out until that set
names it.

## Scope

- `src/components/CnIndexPage/useSelfFetchList.js`: the seeded visible set leaves `hidden: true` columns out.
- `src/components/CnIndexPage/CnIndexPage.vue`: `tableColumns` drops a `hidden: true` column unless the visible set
  names it (also with no visible set, and also for a column the sidebar does not govern).
- No manifest key, no schema change: `hidden` is already documented on the column object.
