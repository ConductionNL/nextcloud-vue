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
