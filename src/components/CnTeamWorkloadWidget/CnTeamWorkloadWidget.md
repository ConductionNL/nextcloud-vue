The team today from an app's workload endpoint, with each person's Nextcloud user status.

```vue
<CnTeamWorkloadWidget
  :content="{
    source: { url: '/apps/dossiq/api/work-queue/workload', responsePath: 'handlers', userField: 'handler', countField: 'openCaseCount' },
    capacity: 12,
  }" />
```

Props: `content` holds the source, the capacity and the labels.
