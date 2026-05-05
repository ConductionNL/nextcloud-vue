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
