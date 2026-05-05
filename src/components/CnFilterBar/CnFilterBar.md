Search only — just the search input with clear button:

```vue
<template>
  <div>
    <CnFilterBar
      :search-value="search"
      search-placeholder="Search clients..."
      @search="search = $event"
      @clear-all="search = ''" />
    <p style="font-size: 13px; margin-top: 8px; color: var(--color-text-maxcontrast);">Search: {{ search || '(empty)' }}</p>
  </div>
</template>
<script>
export default {
  data() {
    return { search: '' }
  },
}
</script>
```

With select and checkbox filters:

```vue
<template>
  <div>
    <CnFilterBar
      :search-value="search"
      search-placeholder="Search..."
      :filters="filters"
      @search="search = $event"
      @filter-change="onFilterChange"
      @clear-all="clearAll" />
    <div style="font-size: 13px; margin-top: 8px; color: var(--color-text-maxcontrast);">
      <div>Search: {{ search || '(empty)' }}</div>
      <div>Status: {{ activeStatus || 'all' }}</div>
      <div>Active only: {{ activeOnly }}</div>
    </div>
  </div>
</template>
<script>
export default {
  data() {
    return {
      search: '',
      activeStatus: null,
      activeOnly: false,
      filters: [
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          value: null,
          options: [
            { value: 'open', label: 'Open' },
            { value: 'closed', label: 'Closed' },
            { value: 'pending', label: 'Pending' },
          ],
        },
        {
          key: 'active',
          label: 'Active only',
          type: 'checkbox',
          value: false,
        },
      ],
    }
  },
  methods: {
    onFilterChange({ key, value }) {
      if (key === 'status') {
        this.activeStatus = value?.value || null
        this.filters[0].value = value
      }
      if (key === 'active') {
        this.activeOnly = value
        this.filters[1].value = value
      }
    },
    clearAll() {
      this.search = ''
      this.activeStatus = null
      this.activeOnly = false
      this.filters[0].value = null
      this.filters[1].value = false
    },
  },
}
</script>
```
