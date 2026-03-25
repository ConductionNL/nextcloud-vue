---
sidebar_position: 12
---

# CnFilterBar

The top action bar of a list page. Shows the current result count, view-mode toggle, primary add button, and the bulk Actions menu.

**Wraps**: NcButton, NcActions, NcActionButton

![CnFilterBar showing Cards/Table toggle, Add button, and Actions menu](/img/screenshots/cn-filter-bar.png)

## Anatomy

```
+--------------------------------------------------------------------------+
|  Showing N of N  |  [Cards] [Table]  |  [+ Add Entity]  [··· Actions ▾]  |  [⊞]
+--------------------------------------------------------------------------+
        ↑                   ↑                   ↑              ↑              ↑
   result count        view toggle          primary CTA    bulk actions    sidebar toggle
```

| Region | Description |
|--------|-------------|
| **Result count** | "Showing N of N" — total visible vs total matched |
| **View toggle** | Cards / Table radio buttons to switch between `CnCardGrid` and `CnDataTable` |
| **Add button** | Primary call-to-action — opens CnFormDialog or navigates to create route |
| **Actions menu** | Bulk-action dropdown — import, export, mass copy, mass delete |
| **Sidebar toggle** | Icon button that opens/closes the `CnIndexSidebar` |

## Usage

```vue
<CnFilterBar
  :result-count="objects.length"
  :total-count="pagination.totalItems"
  :view-mode="viewMode"
  :add-label="t('myapp', 'Add Client')"
  :actions="bulkActions"
  @view-change="viewMode = $event"
  @add="onCreate"
  @action="onBulkAction" />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `filters` | Array | `[]` | Filter definitions for embedded filter controls: `[{ key, label, type, options?, value? }]`. Filter types: `'select'`, `'text'`, `'checkbox'` |
| `searchValue` | String | `''` | Current search term (controlled) |
| `searchPlaceholder` | String | `'Search...'` | Placeholder text for the search input |
| `showClearAll` | Boolean | `true` | Show a "Clear filters" button when any filter is active |
| `clearAllLabel` | String | `'Clear filters'` | Label for the clear-all button |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `search` | `term` | Emitted when the search input value changes |
| `filter-change` | `{ key, value }` | Emitted when any filter value changes; includes the filter key and new value |
| `clear-all` | — | Emitted when the clear-all button is clicked |
