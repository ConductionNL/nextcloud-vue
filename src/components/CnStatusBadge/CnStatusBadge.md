Variants — all six color variants:

```vue
<div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
  <CnStatusBadge label="Default" />
  <CnStatusBadge label="Primary" variant="primary" />
  <CnStatusBadge label="Success" variant="success" />
  <CnStatusBadge label="Warning" variant="warning" />
  <CnStatusBadge label="Error" variant="error" />
  <CnStatusBadge label="Info" variant="info" />
</div>
```

Sizes — `small` trims padding, `medium` is the default:

```vue
<div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
  <CnStatusBadge label="Small" size="small" variant="primary" />
  <CnStatusBadge label="Medium" size="medium" variant="primary" />
  <CnStatusBadge label="Small success" variant="success" size="small" />
  <CnStatusBadge label="Medium success" variant="success" />
</div>
```

Solid — filled background with white text, useful on colored card backgrounds:

```vue
<div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 12px; background: var(--color-background-dark); border-radius: 6px;">
  <CnStatusBadge label="Solid primary" variant="primary" solid />
  <CnStatusBadge label="Solid success" variant="success" solid />
  <CnStatusBadge label="Solid warning" variant="warning" solid />
  <CnStatusBadge label="Solid error" variant="error" solid />
</div>
```

colorMap — resolves variant automatically from the label value (case-insensitive):

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CnStatusBadge
      v-for="status in statuses"
      :key="status"
      :label="status"
      :color-map="colorMap" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      statuses: ['Open', 'Pending', 'Closed', 'Overdue'],
      colorMap: {
        open: 'success',
        pending: 'warning',
        closed: 'default',
        overdue: 'error',
      },
    }
  },
}
</script>
```

Custom icon slot — prepend an icon inside the badge before the label text:

```vue
<div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
  <CnStatusBadge label="Verified" variant="success">
    <template #icon>
      <CheckCircle :size="14" style="vertical-align: middle; margin-right: 2px;" />
    </template>
  </CnStatusBadge>
  <CnStatusBadge label="Blocked" variant="error">
    <template #icon>
      <AlertCircle :size="14" style="vertical-align: middle; margin-right: 2px;" />
    </template>
  </CnStatusBadge>
</div>
```

The `icon` slot renders inside the default slot, before the label text. Use it to prepend a small icon to the badge.
