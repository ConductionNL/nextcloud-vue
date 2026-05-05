CnIndexSidebar wraps `NcAppSidebar` — it renders inside the Nextcloud app layout. In the styleguide it displays in a contained box.

Basic — search tab with schema-driven filters:

```vue
<template>
  <div style="height: 500px; border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; position: relative;">
    <CnIndexSidebar
      :open="true"
      :search-value="search"
      :schema="schema"
      :active-filters="activeFilters"
      @search="search = $event"
      @filter-change="onFilter"
      @update:open="() => {}" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      search: '',
      activeFilters: {},
      schema: {
        properties: {
          status: {
            type: 'string',
            title: 'Status',
            enum: ['open', 'closed', 'pending'],
            facetable: true,
          },
          priority: {
            type: 'string',
            title: 'Priority',
            enum: ['high', 'medium', 'low'],
            facetable: true,
          },
        },
      },
    }
  },
  methods: {
    onFilter({ key, value }) {
      this.activeFilters = { ...this.activeFilters, [key]: value }
    },
  },
}
</script>
```

With icon, visible columns, and column groups:

```vue
<CnIndexSidebar
  icon="AccountGroup"
  :schema="schema"
  :visible-columns="visibleCols"
  :column-groups="[
    { id: 'meta', label: 'Metadata', columns: [{ key: 'created', label: 'Created' }, { key: 'updated', label: 'Updated' }] },
  ]"
  :show-metadata="true"
  properties-group-label="Contact properties"
  @columns-change="visibleCols = $event" />
```

With live facet data from the API:

```vue
<CnIndexSidebar
  :schema="schema"
  :facet-data="{
    status: { values: [{ value: 'open', count: 14 }, { value: 'closed', count: 7 }] },
    priority: { values: [{ value: 'high', count: 3 }] },
  }"
  :active-filters="filters"
  @filter-change="onFilter" />
```

With custom tab labels and default tab:

```vue
<CnIndexSidebar
  :schema="schema"
  search-placeholder="Zoek..."
  search-tab-label="Zoeken"
  columns-tab-label="Kolommen"
  search-label="Zoekterm"
  filters-label="Filters"
  columns-heading="Kolom zichtbaarheid"
  columns-description="Selecteer welke kolommen zichtbaar zijn"
  default-tab="columns-tab" />
```

With admin-only filter control:

```vue
<CnIndexSidebar
  :schema="schema"
  :user-is-admin="currentUser.isAdmin"
  @filter-change="onFilter" />
```

## Additional props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | String | `''` | MDI icon name or emoji shown in the sidebar header. Falls back to `schema.icon` |
| `visibleColumns` | Array | `null` | Currently visible column keys; `null` means all visible |
| `facetData` | Object | `{}` | Live facet data from the API: `{ fieldName: { values: [{ value, count }] } }` |
| `columnGroups` | Array | `[]` | Extra column groups beyond schema properties and built-in Metadata. Each: `{ id, label, columns: [{ key, label }], expanded? }` |
| `showMetadata` | Boolean | `true` | Whether to include the built-in Metadata column group |
| `searchPlaceholder` | String | `'Type to search...'` | Placeholder text for the search input |
| `searchTabLabel` | String | `'Search'` | Label for the Search tab |
| `columnsTabLabel` | String | `'Columns'` | Label for the Columns tab |
| `searchLabel` | String | `'Search'` | Heading for the search field section |
| `filtersLabel` | String | `'Filters'` | Heading for the filters section |
| `columnsHeading` | String | `'Column visibility'` | Heading for the column visibility section |
| `columnsDescription` | String | `'Select which columns to display in the table'` | Description below the column visibility heading |
| `propertiesGroupLabel` | String | `''` | Override label for the schema properties group. Falls back to `schema.title` |
| `defaultTab` | String | `'search-tab'` | Tab id that is active when the sidebar opens. Built-in ids: `'search-tab'`, `'columns-tab'` |
| `userIsAdmin` | Boolean | `true` | When `false`, schema properties with `adminOnly: true` are hidden from filters |
