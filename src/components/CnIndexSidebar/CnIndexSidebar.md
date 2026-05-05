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
