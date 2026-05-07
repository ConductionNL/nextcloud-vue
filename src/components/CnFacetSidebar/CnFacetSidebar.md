Basic — schema-driven facet sidebar with select and checkbox filters:

```vue
<template>
  <div style="display: flex; gap: 24px;">
    <div style="width: 220px; flex-shrink: 0;">
      <CnFacetSidebar
        title="Filters"
        :filters="filters"
        :active-filters="activeFilters"
        @filter-change="onFilterChange"
        @clear-all="activeFilters = {}" />
    </div>
    <div style="flex: 1;">
      <p style="font-size: 13px; color: var(--color-text-maxcontrast);">Active filters: {{ JSON.stringify(activeFilters) }}</p>
    </div>
  </div>
</template>
<script>
export default {
  data() {
    return {
      activeFilters: {},
      filters: [
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { label: 'Open', value: 'open' },
            { label: 'Closed', value: 'closed' },
            { label: 'Pending', value: 'pending' },
          ],
        },
        {
          key: 'priority',
          label: 'Priority',
          type: 'select',
          options: [
            { label: 'High', value: 'high' },
            { label: 'Medium', value: 'medium' },
            { label: 'Low', value: 'low' },
          ],
        },
        {
          key: 'active',
          label: 'Active only',
          type: 'checkbox',
        },
      ],
    }
  },
  methods: {
    onFilterChange({ key, value }) {
      this.activeFilters = { ...this.activeFilters, [key]: value }
    },
  },
}
</script>
```

Loading state:

```vue
<CnFacetSidebar
  title="Filters"
  :filters="[]"
  :loading="true"
  :active-filters="{}" />
```

With live `facetData` from the API — option labels include counts when facet data is provided:

```vue
<template>
  <div style="display: flex; gap: 24px;">
    <div style="width: 240px; flex-shrink: 0;">
      <CnFacetSidebar
        :schema="schema"
        :facet-data="facetData"
        :active-filters="activeFilters"
        clear-label="Reset filters"
        @filter-change="onFilterChange"
        @clear-all="activeFilters = {}" />
    </div>
    <div style="flex: 1;">
      <p style="font-size: 13px; color: var(--color-text-maxcontrast);">Active: {{ JSON.stringify(activeFilters) }}</p>
    </div>
  </div>
</template>
<script>
export default {
  data() {
    return {
      activeFilters: {},
      schema: {
        properties: {
          status: { type: 'string', title: 'Status', facetable: true, enum: ['open', 'closed'] },
          type: { type: 'string', title: 'Type', facetable: true, enum: ['invoice', 'order'] },
        },
      },
      facetData: {
        status: { values: [{ value: 'open', count: 42 }, { value: 'closed', count: 108 }] },
        type: { values: [{ value: 'invoice', count: 55 }, { value: 'order', count: 95 }] },
      },
    }
  },
  methods: {
    onFilterChange({ key, values }) {
      this.activeFilters = { ...this.activeFilters, [key]: values }
    },
  },
}
</script>
```

Admin-only filters — set `userIsAdmin` to `false` to hide schema properties marked `adminOnly: true`:

```vue
<CnFacetSidebar
  :schema="{
    properties: {
      status: { type: 'string', title: 'Status', facetable: true },
      internalRef: { type: 'string', title: 'Internal ref', facetable: true, adminOnly: true },
    },
  }"
  :user-is-admin="false"
  :active-filters="{}"
  @filter-change="() => {}"
  @clear-all="() => {}" />
```

## Additional props

| Prop | Type | Default | Description |
|---|---|---|---|
| `facetData` | `Object` | `{}` | Live facet data from the API: `{ fieldName: { values: [{ value, count }] } }`. When a field has facet data, its option labels include the count in parentheses. Falls back to the static `enum` values from the schema. |
| `clearLabel` | `String` | `'Clear all'` | Label for the "Clear all" button shown when any filter is active |
| `userIsAdmin` | `Boolean` | `true` | When `false`, schema properties with `adminOnly: true` are hidden from the filter list |
