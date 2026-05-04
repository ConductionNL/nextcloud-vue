---
sidebar_position: 4
---

# CnFacetSidebar

Auto-generated faceted search sidebar from schema. Renders filter controls for properties marked as facetable, with live counts from the API.

**Wraps**: NcButton, NcSelect, NcTextField, NcCheckboxRadioSwitch, NcLoadingIcon

![CnFacetSidebar showing search and filter tabs](/img/screenshots/cn-facet-sidebar.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `schema` | Object | *(required)* | Schema with facetable properties |
| `facetData` | Object | `{}` | Live facet data with field names as keys, each containing a values array with value/count pairs |
| `activeFilters` | Object | `{}` | Current active filters with field names as keys and value or value arrays |
| `loading` | Boolean | `false` | Loading state |
| `title` | String | `'Filters'` | Sidebar title |
| `clearLabel` | String | `'Clear all'` | Clear all button label |
| `userIsAdmin` | Boolean | `true` | Whether the current user is an admin. When `false`, schema properties with `adminOnly: true` are hidden from the filter list. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `filter-change` | `{ key, values }` | Filter changed (values is always an array) |
| `clear-all` | — | Clear all button clicked |

## Usage

```vue
<template>
  <CnFacetSidebar
    :schema="schema"
    :facet-data="facets"
    :active-filters="activeFilters"
    @filter-change="onFilterChange"
    @clear-all="onClearAll" />
</template>
```
