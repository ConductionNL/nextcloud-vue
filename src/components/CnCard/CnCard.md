Basic — title, description, and stats:

```vue
<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 700px;">
  <CnCard
    title="Open Register"
    description="Structured data management for Nextcloud apps"
    :stats="[
      { label: 'Schemas', value: 12 },
      { label: 'Objects', value: '4.8k' },
    ]" />
  <CnCard
    title="Open Catalogi"
    description="Publication and discovery platform for government data"
    :stats="[
      { label: 'Publications', value: 284 },
      { label: 'Categories', value: 8 },
    ]" />
  <CnCard
    title="Pipelinq"
    description="Process automation and workflow management"
    :stats="[
      { label: 'Pipelines', value: 5 },
      { label: 'Runs', value: 1420 },
    ]" />
</div>
```

With labels and active state:

```vue
<template>
  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; max-width: 480px;">
    <CnCard
      title="Production"
      description="Main production environment"
      :labels="[{ text: 'Active', variant: 'success' }, { text: 'Default', variant: 'warning' }]"
      :active="true"
      active-variant="success" />
    <CnCard
      title="Staging"
      description="Pre-production testing environment"
      :labels="[{ text: 'Inactive', variant: 'default' }]" />
  </div>
</template>
```

With footer tags and links:

```vue
<div style="max-width: 280px;">
  <CnCard
    title="Open Register"
    description="A Nextcloud app for structured data"
    :tags="['vue', 'nextcloud', 'open-source']"
    :footer-links="[{ url: 'https://github.com', label: 'GitHub' }]" />
</div>
```

Clickable — hover effect and click event:

```vue
<template>
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 500px;">
    <CnCard
      v-for="item in items"
      :key="item.id"
      :title="item.title"
      :description="item.description"
      :clickable="true"
      @click="selected = item.title" />
  </div>
  <p style="margin-top: 8px; font-size: 13px;">Clicked: {{ selected || '—' }}</p>
</template>
<script>
export default {
  data() {
    return {
      selected: '',
      items: [
        { id: 1, title: 'Reports', description: 'View quarterly reports' },
        { id: 2, title: 'Invoices', description: 'Manage customer invoices' },
        { id: 3, title: 'Contacts', description: 'Customer contact list' },
      ],
    }
  },
}
</script>
```
