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
