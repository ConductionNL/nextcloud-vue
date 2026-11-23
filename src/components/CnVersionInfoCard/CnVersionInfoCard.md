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
  app-name="LaunchPad"
  app-version="1.0.0"
  :additional-items="[
    { label: 'PHP', value: '8.2.12' },
    { label: 'Database', value: 'Connected', statusClass: 'cn-version-info__status--ok' },
    { label: 'License', value: 'AGPL-3.0' },
  ]">
  <template #actions>
    <button class="button button-vue" @click="() => {}">Clear cache</button>
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
  app-name="Dossiq"
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
| `wide` | Boolean | `true` | Under the board look the card spans the whole settings grid, as the boards draw it. `false` keeps it one card in the grid. No effect without the board look. |
| `cardTitle` | String | `'Application information'` | Heading inside the gray version card |
| `loading` | Boolean | `false` | Show a loading spinner and hide the card content while data is fetching |
| `labels` | Object | `{}` | Custom labels for the standard row headings (`appName`, `version`, `configuredVersion`); a label left out keeps the translated default |
| `showAppName` | Boolean | `true` | Board look: draw the "Application name" row (PqBeheer does; dossiq's boards pass `false`) |
| `actionsDivider` | Boolean | `true` | Board look: draw a rule between the facts and the buttons (PqBeheer does; dossiq's boards pass `false`) |
| `compact` | Boolean | `false` | Board look: dossiq's compact card in one switch (no app name row, no rule, the state inline, 15px facts) |
| `inlineUpToDate` | Boolean | `false` | Board look: the up-to-date state inline in the configured version row (dossiq's boards pass `true`) instead of a disabled button (PqBeheer) |


`look` is documented in the prop table of the component reference (board look, screens-chrome-parity).
