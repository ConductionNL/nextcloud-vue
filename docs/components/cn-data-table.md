---
sidebar_position: 5
---

# CnDataTable

Sortable data table with row selection, loading states, and schema-driven column generation. Supports dot notation for nested values (e.g., `address.city`).

**Wraps**: NcLoadingIcon, NcCheckboxRadioSwitch, CnCellRenderer

![CnDataTable showing sortable columns, checkboxes, and row action buttons](/img/screenshots/cn-data-table.png)

![CnDataTable showing sortable columns, checkboxes, and row action buttons](/img/screenshots/cn-data-table.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | Array | `[]` | Manual column definitions: `[\{ key, label, sortable?, width?, class?, cellClass? \}]` |
| `schema` | Object | `null` | Schema for auto-generating columns |
| `columnOverrides` | Object | `\{\}` | Per-column overrides |
| `excludeColumns` | Array | `[]` | Schema columns to hide |
| `includeColumns` | Array | `null` | Schema columns to show (whitelist) |
| `rows` | Array | `[]` | Row data |
| `loading` | Boolean | `false` | Loading state |
| `sortKey` | String | `null` | Current sort key |
| `sortOrder` | String | `'asc'` | `'asc'` or `'desc'` |
| `selectable` | Boolean | `false` | Enable row selection |
| `selectedIds` | Array | `[]` | Currently selected IDs |
| `rowKey` | String | `'id'` | Unique identifier field |
| `emptyText` | String | `'No items found'` | |
| `rowClass` | Function | `null` | CSS class provider `(row) => className` |
| `scrollable` | Boolean | `false` | Enable table horizontal scrolling |
| `loadingText` | String | `'Loading...'` | |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `sort` | `\{ key, order \}` | Sortable column header clicked |
| `select` | `ids[]` | Row selection changed |
| `select-all` | `isSelectAll` | Select-all checkbox toggled |
| `row-click` | `row` | Row clicked |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `#column-\{key\}` | `\{ row, value \}` | Custom cell renderer per column |
| `#row-actions` | `\{ row \}` | Row action buttons |
| `#empty` | — | Custom empty state |

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
