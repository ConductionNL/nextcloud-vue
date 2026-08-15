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

With icon, visible columns, and column groups — toggle checkboxes in the **Columns** tab to hide/show columns in the table. Three groups appear: **Contact properties** (from the schema), **Metadata** (auto-injected by the component when `show-metadata` is `true`, listing the standard OpenRegister system fields like `created`/`updated`), and **Contact details** (a custom group supplied via the `column-groups` prop for fields that aren't in the schema):

```vue
<template>
  <div style="display: flex; gap: 16px; height: 500px;">
    <div style="flex: 1; border: 1px solid var(--color-border); border-radius: 8px; padding: 12px; overflow: auto;">
      <p style="font-size: 13px; margin: 0 0 8px;">
        Visible columns: <strong>{{ visibleCols.join(', ') || '(none)' }}</strong>
      </p>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr>
            <th v-for="col in shownColumns" :key="col.key"
              style="text-align: left; padding: 6px; border-bottom: 1px solid var(--color-border);">
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.name">
            <td v-for="col in shownColumns" :key="col.key"
              style="padding: 6px; border-bottom: 1px solid var(--color-border-dark);">
              {{ row[col.key] }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div style="width: 320px; border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; position: relative;">
      <CnIndexSidebar
        icon="AccountGroup"
        :open="true"
        :schema="schema"
        :visible-columns="visibleCols"
        :column-groups="columnGroups"
        :show-metadata="true"
        default-tab="columns-tab"
        properties-group-label="Contact properties"
        @columns-change="visibleCols = $event"
        @update:open="() => {}" />
    </div>
  </div>
</template>
<script>
export default {
  data() {
    return {
      visibleCols: ['name', 'email', 'created'],
      schema: {
        title: 'Contacts',
        properties: {
          name: { type: 'string', title: 'Name' },
          email: { type: 'string', title: 'Email' },
        },
      },
      columnGroups: [
        { id: 'contact-details', label: 'Contact details', columns: [
          { key: 'phone', label: 'Phone' },
          { key: 'address', label: 'Address' },
        ] },
      ],
      rows: [
        { name: 'Alice', email: 'alice@example.com', phone: '+31 20 555 0101', address: 'Damrak 1, Amsterdam', created: '2025-01-04', updated: '2025-04-12' },
        { name: 'Bob', email: 'bob@example.com', phone: '+31 10 555 0202', address: 'Coolsingel 5, Rotterdam', created: '2025-02-18', updated: '2025-03-30' },
        { name: 'Carol', email: 'carol@example.com', phone: '+31 70 555 0303', address: 'Plein 12, Den Haag', created: '2025-03-01', updated: '2025-05-08' },
      ],
    }
  },
  computed: {
    allColumns() {
      const props = Object.entries(this.schema.properties).map(([key, p]) => ({ key, label: p.title || key }))
      const groupCols = this.columnGroups.flatMap(g => g.columns)
      return [...props, ...groupCols]
    },
    shownColumns() {
      return this.allColumns.filter(c => this.visibleCols.includes(c.key))
    },
  },
}
</script>
```

With live facet data from the API:

```vue
<template>
  <CnIndexSidebar
    :schema="schema"
    :facet-data="{
      status: { values: [{ value: 'open', count: 14 }, { value: 'closed', count: 7 }] },
      priority: { values: [{ value: 'high', count: 3 }] },
    }"
    :active-filters="filters"
    @filter-change="onFilter" />
</template>
<script>
export default {
  data() {
    return {
      filters: {},
      schema: {
        properties: {
          status: { type: 'string', title: 'Status', enum: ['open', 'closed'], facetable: true },
          priority: { type: 'string', title: 'Priority', enum: ['high', 'medium', 'low'], facetable: true },
        },
      },
    }
  },
  methods: {
    onFilter({ key, value }) {
      this.filters = { ...this.filters, [key]: value }
    },
  },
}
</script>
```

With custom tab labels and default tab:

```vue
<CnIndexSidebar
  :schema="{ properties: { status: { type: 'string', title: 'Status', enum: ['open', 'closed'], facetable: true } } }"
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
  :schema="{ properties: { status: { type: 'string', title: 'Status', adminOnly: true, enum: ['open', 'closed'], facetable: true } } }"
  :user-is-admin="false"
  @filter-change="() => {}" />
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
