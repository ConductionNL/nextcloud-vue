Basic — app name and version display:

```vue
<CnVersionInfoCard
  app-name="Open Register"
  app-version="0.3.1" />
```

Up-to-date with configured version:

```vue
<CnVersionInfoCard
  app-name="Open Catalogi"
  app-version="0.2.8"
  configured-version="0.2.8"
  :is-up-to-date="true"
  :show-update-button="true" />
```

Update available — shows error-styled update button:

```vue
<template>
  <CnVersionInfoCard
    app-name="Pipelinq"
    app-version="0.1.7"
    configured-version="0.1.2"
    :is-up-to-date="false"
    :show-update-button="true"
    :updating="updating"
    @update="runUpdate" />
</template>
<script>
export default {
  data() { return { updating: false } },
  methods: {
    runUpdate() {
      this.updating = true
      setTimeout(() => { this.updating = false }, 2000)
    },
  },
}
</script>
```

With additional items and extra actions:

```vue
<CnVersionInfoCard
  app-name="MyDash"
  app-version="1.0.0"
  :additional-items="[
    { label: 'PHP', value: '8.2.12' },
    { label: 'Database', value: 'Connected', statusClass: 'cn-version-info__status--ok' },
    { label: 'License', value: 'AGPL-3.0' },
  ]">
  <template #actions>
    <NcButton type="secondary" @click="() => {}">Clear cache</NcButton>
  </template>
</CnVersionInfoCard>
```

With `title`, `description`, `docUrl`, `cardTitle`, `loading`, and `labels`:

```vue
<CnVersionInfoCard
  title="App information"
  description="Review the installed version of this application"
  doc-url="https://docs.example.com/my-app"
  card-title="Installation details"
  :loading="false"
  :labels="{
    appName: 'App name',
    version: 'Installed version',
    configuredVersion: 'DB schema version',
  }"
  app-name="Procest"
  app-version="0.4.2"
  configured-version="0.4.2"
  :is-up-to-date="true" />
```

## Additional props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `'Version information'` | Section heading (passed to the wrapping CnSettingsSection) |
| `description` | String | `'Information about the current application installation'` | Section sub-heading |
| `docUrl` | String | `''` | Documentation URL — shows an info icon link next to the section title |
| `cardTitle` | String | `'Application information'` | Heading inside the gray version card |
| `loading` | Boolean | `false` | Show a loading spinner and hide the card content while data is fetching |
| `labels` | Object | `{ appName, version, configuredVersion }` | Custom labels for the standard row headings (for i18n) |
