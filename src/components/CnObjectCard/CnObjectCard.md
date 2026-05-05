Basic — schema-driven card resolves title and description from `schema.configuration`:

```vue
<CnObjectCard
  :object="{ id: 1, title: 'Open Register', description: 'A Nextcloud app for structured data management', status: 'active', version: '0.3.1' }"
  :schema="{
    properties: {
      title: { type: 'string', title: 'Name' },
      description: { type: 'string', title: 'Description' },
      status: { type: 'string', title: 'Status', enum: ['active', 'beta', 'deprecated'] },
      version: { type: 'string', title: 'Version' },
    },
    configuration: { titleProperty: 'title', descriptionProperty: 'description' },
  }" />
```

With actions slot:

```vue
<template>
  <CnObjectCard
    :object="item"
    :schema="schema">
    <template #actions="{ object }">
      <CnRowActions :actions="actions" :row="object" />
    </template>
    <template #badges="{ object }">
      <CnStatusBadge :label="object.status" :color-map="{ active: 'success', beta: 'warning', deprecated: 'error' }" size="small" />
    </template>
  </CnObjectCard>
</template>
<script>
import Pencil from 'vue-material-design-icons/Pencil.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
export default {
  data() {
    return {
      item: { id: 2, title: 'Open Catalogi', description: 'Publication and discovery platform', status: 'beta', version: '0.2.8' },
      schema: {
        properties: {
          title: { type: 'string', title: 'Name' },
          description: { type: 'string', title: 'Description' },
          status: { type: 'string', title: 'Status' },
          version: { type: 'string', title: 'Version' },
        },
        configuration: { titleProperty: 'title', descriptionProperty: 'description' },
      },
      actions: [
        { label: 'Edit', icon: Pencil, handler: (row) => alert(`Edit: ${row.title}`) },
        { label: 'Delete', icon: TrashCanOutline, destructive: true, handler: () => {} },
      ],
    }
  },
}
</script>
```

Selectable — checkbox on the card for mass selections:

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <p style="font-size: 13px;">Selected: {{ selected ? item.title : 'none' }}</p>
    <CnObjectCard
      :object="item"
      :schema="schema"
      :selectable="true"
      :selected="selected"
      @select="selected = !selected" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      selected: false,
      item: { id: 3, title: 'Pipelinq', description: 'Process automation platform', status: 'active', version: '0.1.2' },
      schema: {
        properties: {
          title: { type: 'string', title: 'Name' },
          description: { type: 'string', title: 'Description' },
        },
        configuration: { titleProperty: 'title', descriptionProperty: 'description' },
      },
    }
  },
}
</script>
```
