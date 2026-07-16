Basic — static card with title and icon emoji:

```vue
<CnSettingsCard title="Database connection" icon="🗄️">
  <CnDetailGrid :items="[
    { label: 'Host', value: 'localhost' },
    { label: 'Port', value: '5432' },
    { label: 'Database', value: 'openregister' },
  ]" layout="horizontal" />
</CnSettingsCard>
```

Collapsible — click header to toggle:

```vue
<div style="display: flex; flex-direction: column; gap: 8px;">
  <CnSettingsCard title="API settings" icon="🔌" collapsible>
    <CnDetailGrid :items="[
      { label: 'Endpoint', value: 'https://api.example.com/v1' },
      { label: 'Timeout', value: '30s' },
    ]" layout="horizontal" />
  </CnSettingsCard>
  <CnSettingsCard title="Cache settings" icon="⚡" collapsible :default-collapsed="true">
    <CnDetailGrid :items="[
      { label: 'TTL', value: '3600s' },
      { label: 'Max size', value: '512 MB' },
    ]" layout="horizontal" />
  </CnSettingsCard>
</div>
```
