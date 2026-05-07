Basic settings section — wraps NcSettingsSection with actions and loading/error states:

```vue
<CnSettingsSection
  name="API configuration"
  description="Configure the REST API connection settings">
  <CnDetailGrid :items="[
    { label: 'Endpoint', value: 'https://api.example.com/v1' },
    { label: 'Timeout', value: '30 seconds' },
    { label: 'Rate limit', value: '100 req/min' },
  ]" layout="horizontal" />
</CnSettingsSection>
```

With action button in the header:

```vue
<template>
  <CnSettingsSection
    name="Email notifications"
    description="Configure how and when email notifications are sent">
    <template #actions>
      <NcButton type="primary" @click="save">Save changes</NcButton>
    </template>
    <CnDetailGrid :items="[
      { label: 'SMTP host', value: 'smtp.example.com' },
      { label: 'Port', value: '587' },
      { label: 'Auth', value: 'STARTTLS' },
    ]" layout="horizontal" />
  </CnSettingsSection>
</template>
<script>
export default {
  methods: { save() {} }
}
</script>
```

Loading state:

```vue
<CnSettingsSection
  name="Version information"
  description="Loading current version data..."
  :loading="true"
  loading-message="Fetching version info..." />
```

With `detailedDescription`, `docUrl`, `errorMessage`, `onRetry`, `retryButtonText`, `empty`, and `emptyMessage`:

```vue
<template>
  <CnSettingsSection
    name="Cache management"
    description="Manage application caches"
    detailed-description="The cache stores computed results to speed up repeated requests. Clear it if you notice stale data being served."
    doc-url="https://docs.example.com/cache"
    :loading="isLoading"
    :error="hasError"
    error-message="Failed to load cache statistics. Check your network connection."
    :on-retry="loadStats"
    retry-button-text="Try again"
    :empty="stats.length === 0"
    empty-message="No cache entries found.">
    <CnDetailGrid :items="stats" layout="horizontal" />
  </CnSettingsSection>
</template>
<script>
export default {
  data() {
    return { isLoading: false, hasError: false, stats: [] }
  },
  methods: {
    loadStats() {
      this.isLoading = true
      setTimeout(() => { this.isLoading = false; this.stats = [{ label: 'Entries', value: '4,821' }] }, 800)
    },
  },
}
</script>
```

## Additional props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `detailedDescription` | String | `''` | Extended description shown in a block below the title (more space than the NcSettingsSection `description`) |
| `docUrl` | String | `''` | Documentation URL — shows an info icon link next to the section title |
| `errorMessage` | String | `'An error occurred'` | Message shown when `error` is `true` |
| `onRetry` | Function | `null` | Callback for the retry button in the error state; button is hidden when `null` |
| `retryButtonText` | String | `'Retry'` | Label for the retry button |
| `empty` | Boolean | `false` | Show the empty state instead of the default slot content |
| `emptyMessage` | String | `'No data available'` | Message shown in the empty state |
