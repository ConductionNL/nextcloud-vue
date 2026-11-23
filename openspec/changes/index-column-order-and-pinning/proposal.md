---
kind: code
depends_on: []
---

# Proposal: index-column-order-and-pinning

## Why

On every index page a user can show and hide columns from the Search and
columns sidebar. They cannot put the columns in the order they read them,
they cannot keep the name column in view while scrolling sideways, and
what they chose is gone on the next page load. So everyone reads the
table in the order the app maker wrote it.

## Row

| matrix | row | name | own rating | built |
|---|---|---|---|---|
| buildiq | `data-user-column-settings` | Let app users choose, reorder and pin table columns themselves, without the builder. | partial | built |

Built evidence: "the user can show and hide columns (CnIndexSidebar.vue:579-621
toggles visibleColumns; CnIndexPage.vue:716,3495); no reorder or pin".
Choosing is the half that is built. Reorder, pin and keeping the choice
are the missing half.

Demand: changelog, https://github.com/nocobase/nocobase/releases/tag/v1.9.0
("Mined 2026-09-26 from changelog: NocoBase 1.9.0"). The row is in the
`data` area, one of buildiq's core areas.

## Competitor evidence, quoted from the buildiq matrix

No competitor is rated yes. Three are partial, and between them they have
every piece:

- Appsmith, partial: "handleReorderColumn in view mode persists a user's
  drag-reordered and frozen columns in browser storage when
  canFreezeColumn ... is on ... Users cannot choose or hide columns
  themselves", https://github.com/appsmithorg/appsmith (v2.4.2)
- Mendix, partial: "Data Grid 2 lets end users hide, reorder by drag and
  drop and resize columns, and can persist this per user; pinning columns
  is not described", https://docs.mendix.com/appstore/modules/data-grid-2/
- Microsoft Power Apps, partial: "users open Edit columns on a
  model-driven grid to add, remove or reorder columns and save personal
  views; pinning is not described",
  https://learn.microsoft.com/en-us/power-apps/user/grid-filters

## What changes

- The Columns tab of the index sidebar lets the user move a column up or
  down, by drag or by keyboard, and pin columns to the start of the
  table.
- Pinned columns stay in view when the table scrolls sideways.
- The choice, the order and the pins are kept per user and per list in
  Nextcloud user preferences, through `useUserPreferences`, the same
  place the manual row order already lives.
- A Reset columns control returns the list to the page's own columns.
- A saved view that carries columns still wins while it is applied.

## Affected projects

- `nextcloud-vue`: `CnIndexSidebar`, `CnIndexPage`, `CnDataTable`,
  `useListView`.
- Consumers: every app on `CnIndexPage`. Buildiq's built apps get it with
  no builder work.

## Backward compatibility

A user who never touches the new controls sees the page's columns in the
page's order, as today. A page may switch the personal layout off with
`config.personalColumns: false`. Nothing is removed.

## Out of scope

- Column width. It is the next thing users ask for, and it is a
  different control on the header, not in the sidebar.
- Sharing a column layout with colleagues. That is a saved view shared
  with a group, `saved-views-shared-by-role`.
