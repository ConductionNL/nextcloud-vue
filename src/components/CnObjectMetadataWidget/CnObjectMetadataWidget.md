Auto-extracts known system fields (id, uuid, uri, register, schema, created, updated, owner, etc.):

```vue
<div style="max-width: 500px;">
  <CnObjectMetadataWidget
    :object-data="{
      id: 1,
      uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      uri: 'https://api.example.com/objects/a1b2c3d4',
      register: 'contacts',
      schema: 'contact',
      status: 'active',
      owner: 'admin',
      created: '2024-01-10T09:00:00Z',
      updated: '2024-03-15T14:30:00Z',
      version: '3',
    }" />
</div>
```

Filtered — show only specific fields:

```vue
<div style="max-width: 400px;">
  <CnObjectMetadataWidget
    title="Timestamps"
    :object-data="{
      id: 42,
      uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      created: '2024-01-10T09:00:00Z',
      updated: '2024-03-15T14:30:00Z',
      owner: 'Jane Smith',
    }"
    :include="['id', 'created', 'updated', 'owner']" />
</div>
```

Horizontal layout with extra items:

```vue
<div style="max-width: 500px;">
  <CnObjectMetadataWidget
    layout="horizontal"
    :object-data="{
      id: 7,
      uuid: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      created: '2024-02-01T08:00:00Z',
      updated: '2024-03-20T11:15:00Z',
    }"
    :extra-items="[
      { label: 'Source system', value: 'CRM' },
      { label: 'Sync status', value: 'Up-to-date' },
    ]" />
</div>
```

Collapsible:

```vue
<div style="max-width: 500px;">
  <CnObjectMetadataWidget
    title="System metadata"
    :collapsible="true"
    :collapsed="true"
    :object-data="{
      id: 99,
      uuid: 'c3d4e5f6-a7b8-9012-cdef-012345678901',
      created: '2024-03-01T10:00:00Z',
      updated: '2024-03-25T16:45:00Z',
      owner: 'system',
    }" />
</div>
```

With `icon`, `columns`, `labelWidth`, `exclude`, `emptyLabel`, and the `actions` slot:

```vue
<div style="max-width: 500px;">
  <CnObjectMetadataWidget
    title="Technical details"
    :icon="infoIcon"
    :columns="2"
    :label-width="120"
    :exclude="['folder', 'textRepresentation', 'locked']"
    empty-label="No system metadata found"
    :object-data="{
      id: 5,
      uuid: 'd4e5f6a7-b8c9-0123-defa-012345678901',
      register: 'publications',
      schema: 'article',
      created: '2024-01-20T10:00:00Z',
      updated: '2024-04-01T08:45:00Z',
      owner: 'editor',
      version: '2',
    }">
    <template #actions>
      <NcButton type="tertiary" @click="copyUuid">Copy UUID</NcButton>
    </template>
  </CnObjectMetadataWidget>
</div>
```

## Additional props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | Object\|Function | `null` | MDI icon component shown in the card header |
| `columns` | Number | `0` | Number of grid columns (only relevant for `layout="grid"`; `0` = auto) |
| `labelWidth` | Number | `150` | Minimum label width in pixels for `layout="horizontal"` |
| `exclude` | Array | `[]` | Metadata field keys to hide |
| `emptyLabel` | String | `'No metadata available'` | Text shown when no metadata fields are present |

## Slots

| Slot | Description |
|------|-------------|
| `actions` | Action buttons rendered in the card header (e.g. a "Copy UUID" button) |
