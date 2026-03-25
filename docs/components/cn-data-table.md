---
sidebar_position: 5
---

# CnDataTable

Sortable data table with row selection, loading states, and schema-driven column generation. Supports dot notation for nested values (e.g., `address.city`).

**Wraps**: NcLoadingIcon, NcCheckboxRadioSwitch, CnCellRenderer

![CnDataTable showing sortable columns, checkboxes, and row action buttons](/img/screenshots/cn-data-table.png)

## Anatomy

```
+--+------+----------↑---------+----------+----------+---------+--+
|  | sel. |  Column A ▲        | Column B | Column C | Column D|  |
+--+------+--------------------+----------+----------+---------+--+
|☐ | 👤   | Alice van den Berg | Dept     | email@.. | Active  |⋮ |
|☐ | 👤   | Bob Jansen         | Dept     | email@.. | Pending |⋮ |
|☐ | 👤   | Carol Smit         | Dept     | email@.. | Active  |⋮ |
+--+------+--------------------+----------+----------+---------+--+
   ↑  ↑          ↑                                      ↑       ↑
   |  avatar   cell value                            badge    row actions
   checkbox                                          renderer
```

| Region | Description |
|--------|-------------|
| **Select-all checkbox** | Checks/unchecks all rows on the current page |
| **Column headers** | Clickable to sort; active column shows ▲ / ▼ direction indicator |
| **Avatar / icon** | Auto-generated from the row's name field via CnCellRenderer |
| **Cell value** | Type-aware rendering: email links, dates, booleans, status badges |
| **Row actions** | Per-row `⋮` menu — rendered via the `#row-actions` slot |
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
| `columns` | Array | `[]` | Manual column definitions when not using schema: `[{ key, label, sortable?, width?, class?, cellClass? }]` |
| `columnOverrides` | Object | `{}` | Per-column overrides applied on top of schema-generated columns; keyed by column key |
| `excludeColumns` | Array | `[]` | Column keys to hide when using schema auto-generation |
| `includeColumns` | Array | `null` | Whitelist of column keys to show; all others hidden (takes precedence over `excludeColumns`) |
| `rows` | Array | `[]` | Array of row data objects to display |
| `loading` | Boolean | `false` | Shows a loading spinner overlay while `true` |
| `loadingText` | String | `'Loading...'` | Accessible label for the loading spinner |
| `sortKey` | String | `null` | Currently sorted column key; controls the ▲/▼ indicator |
| `sortOrder` | String | `'asc'` | Current sort direction — `'asc'` or `'desc'` |
| `selectable` | Boolean | `false` | Enables the checkbox column for multi-row selection |
| `selectedIds` | Array | `[]` | Array of currently selected row IDs (controlled) |
| `rowKey` | String | `'id'` | Property name used as the unique row identifier |
| `emptyText` | String | `'No items found'` | Message shown when `rows` is empty and no `#empty` slot is provided |
| `rowClass` | Function | `null` | Callback `(row) => cssClass` to add dynamic CSS classes to rows |
| `scrollable` | Boolean | `false` | Enables horizontal scrolling for wide tables |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `sort` | `{ key, order }` | Emitted when a sortable column header is clicked |
| `select` | `ids[]` | Emitted when row selection changes; payload is the full updated selection array |
| `select-all` | `isSelectAll` | Emitted when the select-all checkbox is toggled |
| `row-click` | `row` | Emitted when a data row is clicked (not the checkbox) |

### Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `#column-{key}` | `{ row, value }` | Override the cell renderer for a specific column key |
| `#row-actions` | `{ row }` | Content for the last (actions) cell of each row — typically `CnRowActions` |
| `#empty` | — | Custom empty-state content shown when `rows` is empty |
