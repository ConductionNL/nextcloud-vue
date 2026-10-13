---
kind: code
---

# Proposal: screens-data-mini-table-fits

## Summary

A data card shows a list of objects (a ticket's messages with their `createdAt`) as a small table. On pipelinq's ticket
page a `nowrap` inherited from the surface kept every cell on one line, so the table was 766px wide in a 212px value
cell and the card overflowed by 8px (measured on :8080, read-only). The table's cells now wrap whatever an ancestor
sets.

## Scope

- `src/components/CnObjectDataWidget/CnObjectDataWidget.vue`: `white-space: normal` on the mini table's cells.
- Also checked, not changed: the lead page's tab panel overshoot (4px, pipelinq) is the list footer bleed that #1529
  fixed; the chain on the lead page (`.cn-tabs__content > .cn-tab > .cn-detail-widget-host--bare > ... __add`) is
  exactly what that rule targets. The installed `@conduction/nextcloud-vue` 2.81.0 package does not contain #1529
  (its dist has no `-12px` bleed), so the fix arrives with the next release.
