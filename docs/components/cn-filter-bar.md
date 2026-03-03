---
sidebar_position: 12
---

# CnFilterBar

Search and filter controls row with text search, select dropdowns, and checkbox filters.

**Wraps**: NcTextField, NcSelect, NcButton, NcCheckboxRadioSwitch

![CnFilterBar showing Cards/Table toggle, Add button, and Actions menu](/img/screenshots/cn-filter-bar.png)

![CnFilterBar showing Cards/Table toggle, Add button, and Actions menu](/img/screenshots/cn-filter-bar.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `filters` | Array | `[]` | Filter definitions: `[\{ key, label, type, options?, value? \}]` |
| `searchValue` | String | `''` | Current search term |
| `searchPlaceholder` | String | `'Search...'` | |
| `showClearAll` | Boolean | `true` | Show clear all button |
| `clearAllLabel` | String | `'Clear filters'` | |

Filter types: `'select'`, `'text'`, `'checkbox'`

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `search` | `term` | Search input changed |
| `filter-change` | `\{ key, value \}` | Filter value changed |
| `clear-all` | — | Clear all button clicked |

## Usage

```vue
<CnFilterBar
  :search-value="search"
  :filters="[
    { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    { key: 'active', label: 'Active only', type: 'checkbox' },
  ]"
  @search="onSearch"
  @filter-change="onFilterChange"
  @clear-all="onClearAll" />
```
