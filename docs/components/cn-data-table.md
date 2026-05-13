---
sidebar_position: 5
---

import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnDataTable.md'

# CnDataTable

Sortable data table with row selection, loading states, and schema-driven column generation. Supports dot notation for nested values (e.g., `address.city`).

**Wraps**: NcLoadingIcon, NcCheckboxRadioSwitch, CnCellRenderer

## Try it

<Playground component="CnDataTable" />

![CnDataTable showing sortable columns, checkboxes, and row action buttons](/img/screenshots/cn-data-table.png)

## Anatomy

```
+--+------+----------↑---------+----------+----------+---------+----------------+
|  | sel. |  Column A ▲        | Column B | Column C | Column D| Actions header |
+--+------+--------------------+----------+----------+---------+----------------+
|☐ | 👤   | Alice van den Berg | Dept     | email@.. | Active  |⋮               |
|☐ | 👤   | Bob Jansen         | Dept     | email@.. | Pending |⋮               |
|☐ | 👤   | Carol Smit         | Dept     | email@.. | Active  |⋮               |
+--+------+--------------------+----------+----------+---------+----------------+
   ↑  ↑          ↑                                      ↑       ↑
   |  avatar   cell value                            badge    row actions
   checkbox                                          renderer
```

| Region | Description |
|--------|-------------|
| **Select-all checkbox** | Checks/unchecks all rows on the current page |
| **Column headers** | Clickable to sort; cycles through ascending (▲), descending (▼), and no sort (indicator hidden) |
| **Avatar / icon** | Auto-generated from the row's name field via CnCellRenderer |
| **Cell value** | Type-aware rendering: email links, dates, booleans, status badges |
| **Row actions** | Per-row `⋮` menu — rendered via the `#row-actions` slot |
| **Actions header** | Slot above actions row — rendered via the `#actions-header` slot (only renders when row actions exist) |
| **Loading overlay** | Spinner centered over the table body while `loading` is true |
| **Empty state** | "No items found" message (or `#empty` slot) when rows array is empty |

## Usage

```vue
<CnDataTable
  :schema="schema"
  :rows="objects"
  :sort-key="sortKey"
  :sort-order="sortOrder"
  :selectable="true"
  :selected-ids="selected"
  @sort="onSort"
  @select="onSelect"
  @row-click="onRowClick">
  <template #row-actions="{ row }">
    <CnRowActions :actions="rowActions" :row="row" @action="onAction" />
  </template>
</CnDataTable>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `schema` | Object | `null` | Schema object for auto-generating columns from its `properties` map |
| `columns` | Array | `[]` | Column definitions: `[{ key, label, sortable?, width?, align?, class?, cellClass?, formatter?, widget?, widgetProps?, aggregate? }]`. `formatter`/`widget`/`widgetProps` resolve against the app's `cnFormatters`/`cnCellWidgets` registries (provided by `CnAppRoot`) — see [migrating-to-manifest → Column formatters / Column widgets](../migrating-to-manifest.md#column-formatters). `aggregate` (`{ register?, schema, op:"count", where }`) renders the cell as a count of related OpenRegister objects (one `_limit=0` request per row; `@self.<path>` in `where` interpolated per-row; `…` while loading, `—` on failure) — see [migrating-to-manifest → Aggregate columns](../migrating-to-manifest.md#aggregate-columns). The `#column-{key}` scoped slot still overrides everything. |
| `columnOverrides` | Object | `{}` | Per-column overrides applied on top of schema-generated columns; keyed by column key |
| `excludeColumns` | Array | `[]` | Column keys to hide when using schema auto-generation |
| `includeColumns` | Array | `null` | Whitelist of column keys to show; all others hidden (takes precedence over `excludeColumns`) |
| `rows` | Array | `[]` | Array of row data objects to display |
| `loading` | Boolean | `false` | Shows a loading spinner overlay while `true` |
| `loadingText` | String | `'Loading...'` | Accessible label for the loading spinner |
| `sortKey` | String | `null` | Currently sorted column key; controls the ▲/▼ indicator. `null` means no column is actively sorted. |
| `sortOrder` | String | `'asc'` | Current sort direction — `'asc'`, `'desc'`, or `null` (no sort) |
| `selectable` | Boolean | `false` | Enables the checkbox column for multi-row selection |
| `selectedIds` | Array | `[]` | Array of currently selected row IDs (controlled) |
| `rowKey` | String | `'id'` | Property name used as the unique row identifier |
| `emptyText` | String | `'No items found'` | Message shown when `rows` is empty and no `#empty` slot is provided |
| `rowClass` | Function | `null` | Callback `(row) => cssClass` to add dynamic CSS classes to rows |
| `cellClass` | Function | `null` | Callback `(row, col) => cssClass` to add dynamic CSS classes to individual data cells |
| `scrollable` | Boolean | `false` | Enables horizontal scrolling for wide tables |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `sort` | `{ key, order }` | Emitted when a sortable column header is clicked. Cycles through `asc → desc → null`. When the user clears the sort, both `key` and `order` are `null`. |
| `select` | `ids[]` | Emitted when row selection changes; payload is the full updated selection array |
| `select-all` | `isSelectAll` | Emitted when the select-all checkbox is toggled |
| `row-click` | `row` | Emitted when a data row is clicked (not the checkbox) |
| `row-context-menu` | `{ row, event }` | Emitted when a data row is right-clicked. The native `contextmenu` event is prevented. Used by CnIndexPage with the [`useContextMenu`](../utilities/composables/use-context-menu.md) composable to show a context menu at the cursor position. |

### Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `#column-{key}` | `{ row, value }` | Override the cell renderer for a specific column key |
| `#row-actions` | `{ row }` | Content for the last (actions) cell of each row — typically `CnRowActions` |
| `#actions-header` | - | Content for the header above the actions cell — typically a button |
| `#empty` | — | Custom empty-state content shown when `rows` is empty |

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnDataTable.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnDataTable/CnDataTable.vue) and update automatically whenever the component changes.

<GeneratedRef />
