Basic — icon, title, and description. Use `iconSize` (default `28`) to adjust the icon pixel size:

```vue
<CnPageHeader
  title="Clients"
  description="Manage your clients and contact information"
  icon="HelpCircleOutline"
  :icon-size="32" />
```

Title only (no icon, no description):

```vue
<CnPageHeader title="Dashboard" />
```

Custom icon via slot:

```vue
<template>
  <CnPageHeader title="Schemas" description="Configure your data schemas">
    <template #icon>
      <DatabaseOutline :size="28" style="color: var(--color-primary-element);" />
    </template>
  </CnPageHeader>
</template>
<script>
import DatabaseOutline from 'vue-material-design-icons/DatabaseOutline.vue'
export default {
  components: { DatabaseOutline },
}
</script>
```

With extra content (e.g., a badge or status indicator):

```vue
<CnPageHeader title="API Gateway" description="Proxy and routing configuration">
  <template #extra>
    <CnStatusBadge label="Online" variant="success" />
  </template>
</CnPageHeader>
```
