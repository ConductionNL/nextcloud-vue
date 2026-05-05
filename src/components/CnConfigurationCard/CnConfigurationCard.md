Basic — card with status badge, content, and footer action:

```vue
<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; max-width: 600px;">
  <CnConfigurationCard title="Database connection">
    <template #status>
      <CnStatusBadge label="Connected" variant="success" />
    </template>
    <CnDetailGrid :items="[
      { label: 'Host', value: 'localhost:5432' },
      { label: 'Database', value: 'openregister' },
    ]" layout="horizontal" />
  </CnConfigurationCard>

  <CnConfigurationCard title="Email service">
    <template #status>
      <CnStatusBadge label="Not configured" variant="warning" />
    </template>
    <p style="color: var(--color-text-maxcontrast); font-size: 14px;">
      SMTP credentials are required for sending notifications.
    </p>
  </CnConfigurationCard>
</div>
```

With actions:

```vue
<template>
  <CnConfigurationCard title="API integration">
    <template #actions>
      <NcActions>
        <NcActionButton @click="test">Test connection</NcActionButton>
        <NcActionButton @click="edit">Edit</NcActionButton>
      </NcActions>
    </template>
    <template #status>
      <CnStatusBadge :label="status" :color-map="{ active: 'success', error: 'error', testing: 'warning' }" />
    </template>
    <CnDetailGrid :items="[
      { label: 'URL', value: 'https://api.partner.com' },
      { label: 'Auth', value: 'Bearer token' },
    ]" layout="horizontal" />
    <template #footer>
      <span style="font-size: 12px; color: var(--color-text-maxcontrast);">Last tested: 2 hours ago</span>
    </template>
  </CnConfigurationCard>
</template>
<script>
export default {
  data() { return { status: 'active' } },
  methods: {
    test() { this.status = 'testing'; setTimeout(() => { this.status = 'active' }, 1500) },
    edit() {},
  },
}
</script>
```
