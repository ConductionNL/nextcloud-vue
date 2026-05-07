Basic — card with title and content:

```vue
<CnDetailCard title="Contact information">
  <CnDetailGrid :items="[
    { label: 'Name', value: 'Jane Smith' },
    { label: 'Email', value: 'jane@example.com' },
    { label: 'Phone', value: '+31 6 12 34 56 78' },
  ]" layout="horizontal" />
</CnDetailCard>
```

With icon and actions slot:

```vue
<template>
  <CnDetailCard title="API configuration">
    <template #icon>
      <CnIcon name="Database" :size="20" />
    </template>
    <template #actions>
      <button class="button button-vue" @click="editing = !editing">
        {{ editing ? 'Cancel' : 'Edit' }}
      </button>
    </template>
    <CnDetailGrid :items="[
      { label: 'Endpoint', value: 'https://api.example.com/v1' },
      { label: 'Key', value: '••••••••••••' },
      { label: 'Timeout', value: '30s' },
    ]" layout="horizontal" />
  </CnDetailCard>
</template>
<script>
export default {
  data() { return { editing: false } }
}
</script>
```

Collapsible — click header to collapse/expand:

```vue
<div style="display: flex; flex-direction: column; gap: 12px;">
  <CnDetailCard title="Core information" :collapsible="true">
    <CnDetailGrid :items="[
      { label: 'ID', value: 'obj-001' },
      { label: 'Created', value: '2024-01-10' },
    ]" layout="horizontal" />
  </CnDetailCard>
  <CnDetailCard title="Advanced settings" :collapsible="true" :collapsed="true">
    <CnDetailGrid :items="[
      { label: 'Timeout', value: '30s' },
      { label: 'Retries', value: '3' },
    ]" layout="horizontal" />
  </CnDetailCard>
</div>
```

Flush — removes padding so tables/lists go edge-to-edge:

```vue
<CnDetailCard title="Recent items" :flush="true">
  <div style="padding: 0;">
    <div v-for="i in 3" :key="i" style="padding: 10px 16px; border-bottom: 1px solid var(--color-border);">
      Item {{ i }}
    </div>
  </div>
</CnDetailCard>
```

With footer slot:

```vue
<CnDetailCard title="Summary">
  <p>Main content goes here.</p>
  <template #footer>
    <button class="button button-vue" @click="() => {}">View all</button>
  </template>
</CnDetailCard>
```

## Additional props and slots

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | Object\|Function | `null` | Optional MDI icon component rendered in the card header |

| Slot | Description |
|------|-------------|
| `icon` | Override the header icon (replaces the `icon` prop rendering) |
| `footer` | Footer content rendered below the card body (with a top border) |
