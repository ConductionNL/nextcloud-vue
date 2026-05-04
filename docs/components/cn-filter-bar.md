---
sidebar_position: 12
---

# CnFilterBar

Search and filter controls row for list views. Renders a text search input, zero or more typed filter controls (select, text, checkbox), and an optional "Clear filters" button.

**Wraps**: NcTextField, NcSelect, NcButton, NcCheckboxRadioSwitch

## Anatomy

```
+------------------------------------------------------------+
|  [🔍 Search...]  |  [All types ▾]  |  [✓ Active only]  |  [Clear filters]
+------------------------------------------------------------+
        ↑                   ↑                  ↑                     ↑
   search input         select filter     checkbox filter        clear all
```

| Region | Description |
|--------|-------------|
| **Search input** | Free-text search; emits `search` on every keystroke. Shows a clear (×) button while text is entered |
| **Filter controls** | One control per entry in `:filters`. Type `select` renders NcSelect, `text` renders NcTextField, `checkbox` renders NcCheckboxRadioSwitch |
| **Clear filters** | Appears when any filter or the search term is non-empty (when `showClearAll` is `true`); emits `clear-all` |

## Usage

```vue
<CnFilterBar
  :search-value="searchTerm"
  search-placeholder="Search clients..."
  :filters="[
    { key: 'type', label: 'All types', type: 'select', options: typeOptions, value: selectedType },
    { key: 'active', label: 'Active only', type: 'checkbox', value: showActiveOnly },
  ]"
  @search="onSearch"
  @filter-change="onFilterChange"
  @clear-all="clearFilters" />
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
