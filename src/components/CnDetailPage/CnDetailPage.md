CnDetailPage is the generic detail/overview page with stats, cards, and flexible content slots.

Full example with header, stats, and data card:

```vue
<template>
  <div style="height: 500px; overflow: auto; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px;">
    <CnDetailPage
      :object="contact"
      :schema="schema"
      :loading="false"
      title="Jane Smith"
      description="Active contact">
      <template #header-actions>
        <NcButton @click="last = 'edit'">Edit</NcButton>
      </template>
      <template #default>
        <CnDetailCard title="Contact information">
          <CnDetailGrid :items="[
            { label: 'Email', value: contact.email },
            { label: 'Phone', value: contact.phone },
            { label: 'Company', value: contact.company },
            { label: 'Status', value: contact.status },
          ]" layout="horizontal" />
        </CnDetailCard>
      </template>
      <template #sidebar>
        <CnObjectMetadataWidget
          :object-data="contact"
          :include="['id', 'created', 'updated']" />
      </template>
    </CnDetailPage>
  </div>
</template>
<script>
export default {
  data() {
    return {
      last: '',
      contact: {
        id: 1,
        uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        email: 'jane@example.com',
        phone: '+31 6 12 34 56 78',
        company: 'Acme Corp',
        status: 'active',
        created: '2024-01-10T09:00:00Z',
        updated: '2024-03-15T14:30:00Z',
      },
      schema: {
        properties: {
          email: { type: 'string', title: 'Email' },
          phone: { type: 'string', title: 'Phone' },
          company: { type: 'string', title: 'Company' },
          status: { type: 'string', title: 'Status', enum: ['active', 'inactive'] },
        },
      },
    }
  },
}
</script>
```

With icon, subtitle, and stats table:

```vue
<template>
  <div style="height: 400px; overflow: auto; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px;">
    <CnDetailPage
      title="Register Overview"
      description="Statistics and schema details"
      icon="DatabaseOutline"
      :icon-size="32"
      :stats-title="'Register statistics'"
      :stats-columns="[
        { key: 'type', label: 'Type' },
        { key: 'total', label: 'Total' },
        { key: 'size', label: 'Size' },
      ]"
      :stats-rows="[
        { type: 'Objects', total: 150, size: '2.4 MB' },
        { type: 'Files', total: 42, size: '1.1 MB' },
      ]"
      :max-width="'960px'"
      :loading="isLoading">
      <div style="padding: 16px; color: var(--color-text-light);">Chart placeholder</div>
    </CnDetailPage>
  </div>
</template>
<script>
export default {
  data() {
    return { isLoading: false }
  },
}
</script>
```

With error state and retry:

```vue
<template>
  <div style="height: 300px; overflow: auto; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px;">
    <CnDetailPage
      title="Schema details"
      :error="hasError"
      error-message="Failed to load schema"
      :on-retry="loadSchema"
      retry-label="Try again">
      <template #error>
        <div>Custom error layout</div>
      </template>
      <template #actions>
        <NcButton @click="editSchema">Edit</NcButton>
      </template>
    </CnDetailPage>
  </div>
</template>
<script>
export default {
  data() {
    return { hasError: true }
  },
  methods: {
    loadSchema() { this.hasError = false },
    editSchema() {},
  },
}
</script>
```

With empty state and loading label:

```vue
<template>
  <div style="height: 300px; overflow: auto; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px;">
    <CnDetailPage
      title="Audit log"
      :empty="noData"
      empty-label="No audit entries yet"
      loading-label="Fetching audit log..."
      :loading="fetching" />
  </div>
</template>
<script>
export default {
  data() {
    return { noData: true, fetching: false }
  },
}
</script>
```

With sidebar integration:

```vue
<template>
  <div style="height: 300px; overflow: auto; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px;">
    <CnDetailPage
      title="Lead detail"
      :sidebar="true"
      :sidebar-open="true"
      object-type="pipelinq-lead"
      :object-id="lead.id"
      subtitle="Assigned to Jane"
      :sidebar-props="{ register: 'leads', schema: 'lead', hiddenTabs: ['tasks'] }" />
  </div>
</template>
<script>
export default {
  data() {
    return { lead: { id: 42 } }
  },
}
</script>
```

## Additional props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | String | `''` | Optional MDI icon name rendered in the header via `CnIcon` |
| `iconSize` | Number | `28` | Icon size in pixels |
| `loadingLabel` | String | `'Loading...'` | Message shown below the spinner during loading |
| `sidebarOpen` | Boolean | `true` | Whether the sidebar starts expanded |
| `objectType` | String | `''` | Registered object type slug for the sidebar |
| `objectId` | String\|Number | `''` | Object ID to display in the sidebar |
| `subtitle` | String | `''` | Subtitle shown in the sidebar header |
| `sidebarProps` | Object | `{}` | Extra sidebar configuration (`register`, `schema`, `hiddenTabs`, `title`, `subtitle`) |
| `error` | Boolean | `false` | Whether the page is in an error state |
| `errorMessage` | String | `'An error occurred'` | Error message shown in the error state |
| `onRetry` | Function | `null` | Callback for the retry button; when `null` no retry button is shown |
| `retryLabel` | String | `'Retry'` | Label for the retry button |
| `empty` | Boolean | `false` | Whether there is no data to show |
| `emptyLabel` | String | `'No data available'` | Message shown in the empty state |
| `statsTitle` | String | `''` | Title shown above the statistics table |
| `statsColumns` | Array | `[]` | Column definitions for the stats table: `{ key, label, align? }` |
| `statsRows` | Array | `[]` | Row data for the stats table; set `indent: true` for sub-row styling |
| `maxWidth` | String | `'1200px'` | Maximum width of the page content area |
| `subscribe` | Boolean | `true` | When `true` and `objectStore` is provided, auto-subscribes to live updates for `objectType` + `objectId` via `useObjectSubscription`, and renders `CnLockedBanner` when a remote pessimistic lock is active. |
| `objectStore` | Object | `null` | Pinia store instance (typically `useObjectStore()`). Required for `subscribe` to take effect. |

## Slots

| Slot | Description |
|------|-------------|
| `header` | Replace the left header block (icon + title + description). Scope: `{ title, description, icon, iconSize }` |
| `icon` | Replace the icon inside the default header |
| `actions` | Action buttons rendered in the right-hand header area |
| `error` | Custom error state content (replaces default `NcEmptyContent`) |
| `empty` | Custom empty state content |
| `stats-header` | Content above the stats table (replaces the default `statsTitle` heading) |
| `stats-rows` | Custom `<tr>` rows inside the stats table body |
| `sections` | Additional content below the main content area |
| `footer` | Footer content rendered below the body |
| `widget-{widgetId}` | Widget slot in grid layout mode. Scope: `{ item, widget }` |

## Integration props (AD-19)

| Prop | Default | Description |
|---|---|---|
| `surface` | `'detail-page'` | Rendering surface forwarded to integration widgets (`type === 'integration'`) in the grid layout. Drives the AD-19 surface fallback. |
| `integrationContext` (`integration-context`) | `null` | Object context `{ register, schema, objectId }` forwarded to integration widgets. Derived from `sidebarProps` + `objectId` when omitted. |
