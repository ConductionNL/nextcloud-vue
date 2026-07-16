Basic card grid — schema-driven cards with default CnObjectCard rendering:

```vue
<CnCardGrid
  :objects="[
    { id: 1, title: 'Project Alpha', description: 'A long-running infrastructure project', status: 'active', owner: 'Jane Smith' },
    { id: 2, title: 'Project Beta', description: 'New feature development initiative', status: 'pending', owner: 'Bob Jones' },
    { id: 3, title: 'Project Gamma', description: 'Maintenance and bug-fix sprint', status: 'closed', owner: 'Alice Brown' },
  ]"
  :schema="{
    properties: {
      title: { type: 'string', title: 'Title' },
      description: { type: 'string', title: 'Description' },
      status: { type: 'string', title: 'Status', enum: ['active', 'pending', 'closed'] },
      owner: { type: 'string', title: 'Owner' },
    },
    configuration: { titleProperty: 'title', descriptionProperty: 'description' },
  }"
  row-key="id" />
```

Loading state:

```vue
<CnCardGrid
  :objects="[]"
  :schema="{}"
  :loading="true"
  row-key="id" />
```

Empty state:

```vue
<CnCardGrid
  :objects="[]"
  :schema="{}"
  row-key="id"
  empty-text="No items found" />
```

Selectable cards — enable checkboxes for mass selection using `selectable` and `selectedIds`:

```vue
<template>
  <div>
    <p style="font-size: 13px; margin-bottom: 8px;">Selected: {{ selectedIds.join(', ') || 'none' }}</p>
    <CnCardGrid
      :objects="items"
      :schema="schema"
      :selectable="true"
      :selected-ids="selectedIds"
      row-key="id"
      @click="openItem"
      @select="selectedIds = $event" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      selectedIds: [],
      items: [
        { id: 1, title: 'Alpha', description: 'First project' },
        { id: 2, title: 'Beta', description: 'Second project' },
      ],
      schema: {
        properties: {
          title: { type: 'string', title: 'Title' },
          description: { type: 'string', title: 'Description' },
        },
        configuration: { titleProperty: 'title', descriptionProperty: 'description' },
      },
    }
  },
  methods: {
    openItem(object) { alert(`Clicked: ${object.title}`) },
  },
}
</script>
```

Custom card slot — replace the default CnObjectCard with your own rendering:

```vue
<CnCardGrid
  :objects="[
    { id: 1, name: 'Open Register', version: '0.3.1', status: 'active' },
    { id: 2, name: 'Open Catalogi', version: '0.2.8', status: 'active' },
    { id: 3, name: 'Pipelinq', version: '0.1.2', status: 'beta' },
  ]"
  :schema="{}"
  row-key="id">
  <template #card="{ object }">
    <CnCard
      :title="object.name"
      :description="'v' + object.version"
      :labels="[{ text: object.status, variant: object.status === 'active' ? 'success' : 'warning' }]" />
  </template>
</CnCardGrid>
```

## Additional props

| Prop | Type | Default | Description |
|---|---|---|---|
| `selectable` | `Boolean` | `false` | When `true`, each card shows a selection checkbox and the grid emits `select` events |
| `selectedIds` | `Array` | `[]` | Array of currently selected object IDs (matched against `object[rowKey]`) |
