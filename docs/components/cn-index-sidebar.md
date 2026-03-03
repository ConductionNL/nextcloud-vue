---
sidebar_position: 3
---

# CnIndexSidebar

Schema-driven sidebar with tabs for search, filters, and column visibility. Typically used alongside CnIndexPage.

**Wraps**: NcAppSidebar, NcAppSidebarTab, NcTextField, NcSelect, NcCheckboxRadioSwitch, NcPopover (from @nextcloud/vue). See [NcAppSidebar](https://nextcloud-vue-components.netlify.app/) for the underlying primitive.

![CnIndexSidebar showing Search tab with search input and filter dropdowns](/img/screenshots/cn-index-sidebar.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `''` | Sidebar title (defaults to schema.title) |
| `icon` | String | `''` | MDI icon name or emoji |
| `schema` | Object | `null` | Schema for auto-generating filters and column list |
| `visibleColumns` | Array | `null` | Currently visible column keys |
| `searchValue` | String | `''` | Current search term |
| `open` | Boolean | `true` | Sidebar open state |
| `activeFilters` | Object | `\{\}` | Current active filters: `\{ fieldName: [values] \}` |
| `facetData` | Object | `\{\}` | Live facet data: `\{ fieldName: \{ values: [\{ value, count \}] \} \}` |
| `columnGroups` | Array | `[]` | Additional column groups |
| `showMetadata` | Boolean | `true` | Include built-in Metadata group |
| `searchPlaceholder` | String | `'Type to search...'` | |
| `searchTabLabel` | String | `'Search'` | |
| `columnsTabLabel` | String | `'Columns'` | |
| `searchLabel` | String | `'Search'` | |
| `filtersLabel` | String | `'Filters'` | |
| `columnsHeading` | String | `'Column Visibility'` | |
| `columnsDescription` | String | `'Select which columns to display in the table'` | |
| `propertiesGroupLabel` | String | `''` | Override properties group label |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `search` | `searchTerm` | Search input changed |
| `columns-change` | `visibleKeys[]` | Column visibility changed |
| `filter-change` | `\{ key, values \}` | Filter selection changed |
| `update:open` | `isOpen` | Sidebar open state changed |

## Slots

| Slot | Description |
|------|-------------|
| `#search-extra` | Extra content in the Search tab |
| `#columns-extra` | Extra content in the Columns tab |

## Usage

```vue
<template>
  <CnIndexSidebar
    :schema="schema"
    :search-value="search"
    :active-filters="filters"
    :facet-data="facets"
    :visible-columns="columns"
    @search="onSearch"
    @filter-change="onFilterChange"
    @columns-change="onColumnsChange" />
</template>
```

## Icon Resolution

The sidebar header displays an icon from the `icon` prop (or `schema.icon`). Icons are resolved via the [CnIcon](./cn-icon.md) registry — make sure your app has called `registerIcons()` with the required icon components.
