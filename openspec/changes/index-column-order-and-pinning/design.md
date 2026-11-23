# Design: index-column-order-and-pinning

Read at nextcloud-vue development `c8aa85863`.

## What is there

- `CnIndexSidebar` renders the Columns tab with a checkbox per column and
  per group (`src/components/CnIndexSidebar/CnIndexSidebar.vue:138-175`,
  `toggleColumn` at `:624`). It emits a new visible list; it has no order
  of its own.
- `CnIndexPage` keeps the visible list in `effectiveVisibleColumns`
  (`src/components/CnIndexPage/CnIndexPage.vue:3659`), from the
  `visibleColumns` prop (`:2350`) or, in self-fetch mode, from
  `useListView`'s `visibleColumns` ref (`src/composables/useListView.js:77`).
  Neither is written anywhere, so a reload forgets it.
- `useUserPreferences` (`src/composables/useUserPreferences.js`) reads and
  writes a per-user value through the app's preferences endpoint, and
  `CnIndexPage` already uses it for the manual row order through the
  injected `cnUserPreferences` (`:1096`, `manualOrderPreferenceKey()` at
  `:4504`).
- `CnDataTable` has no sticky columns (`position: sticky` is used for the
  footer only).

## Decisions

### D1. One preference per list: which, in what order, how many pinned

```json
{ "columns": ["title", "status", "owner", "updated"], "pinned": 1 }
```

`columns` is the visible set in its order. `pinned` counts from the
start: pinning a column moves it into the pinned block at the start.
Pins in the middle of a table are not offered; a pinned column that is
not at the edge is a column that overlaps its neighbours when scrolling.

The key follows the manual order: `columns.<list id>`, with the list id
from `manualOrderId`, the object type or the schema, so the two
preferences of one list are found together and a retired list takes both
with it.

### D2. Reorder by drag and by keyboard in the sidebar

Each row in the Columns tab gets a handle and Move up and Move down
buttons. The keyboard path is the same method the drag calls, the rule
`case-page-and-list-as-a-place` already set for rows. The header of the
table is not a drag target: a header that moves when clicked to sort is a
header users are afraid to click.

### D3. Pinned columns are sticky in `CnDataTable`

`CnDataTable` gains a `pinnedCount` prop. The first `pinnedCount` columns
(after the selection checkbox) get `position: sticky` with a left offset
summed from the columns before them, and a background from
`--color-main-background` so rows do not show through. The selection
column is always pinned when any column is.

### D4. What wins when

1. A saved view that carries columns, while it is applied.
2. The user's own layout for this list.
3. The page's `config.columns`.

Reset columns deletes the user's preference and returns to 3. A column
the schema no longer has is dropped from the stored layout on read,
silently, and a new schema column is added at the end, hidden.

### D5. A page can switch it off

`config.personalColumns: false` keeps the Columns tab as it is today:
show and hide, not stored. For a page whose column set is a contract,
such as an export preview.

## Files

- `src/components/CnIndexSidebar/CnIndexSidebar.vue`: handle, Move up,
  Move down, Pin, Reset.
- `src/components/CnIndexPage/CnIndexPage.vue`: read and write the layout,
  apply the precedence, pass `pinnedCount`.
- `src/components/CnDataTable/CnDataTable.vue`: `pinnedCount` and the
  sticky offsets.
- `src/composables/useListView.js`: carry the order, not only the set.
- `src/schemas/app-manifest-v2.schema.json`: `personalColumns`.

## Accessibility

Move up and Move down are buttons with labels naming the column. Pin is a
toggle button with `aria-pressed`. A sticky column keeps its header cell
sticky too, so the reading order does not change when scrolling.

## Theming

Sticky cells use `--color-main-background` and a
`--color-border` right edge on the last pinned column.
