Basic — actions array with label and handler:

```vue
<template>
  <div style="display: flex; align-items: center; gap: 8px;">
    <span style="font-size: 13px;">Row: {{ lastAction || 'no action yet' }}</span>
    <CnRowActions
      :actions="actions"
      :row="row" />
  </div>
</template>
<script>
import Pencil from 'vue-material-design-icons/Pencil.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import ContentCopy from 'vue-material-design-icons/ContentCopy.vue'
export default {
  data() {
    return {
      lastAction: '',
      row: { id: 1, title: 'Sample item' },
      actions: [
        {
          label: 'Edit',
          icon: Pencil,
          handler: (row) => { this.lastAction = `Edit: ${row.title}` },
        },
        {
          label: 'Copy',
          icon: ContentCopy,
          handler: (row) => { this.lastAction = `Copy: ${row.title}` },
        },
        {
          label: 'Delete',
          icon: TrashCanOutline,
          destructive: true,
          handler: (row) => { this.lastAction = `Delete: ${row.title}` },
        },
      ],
    }
  },
}
</script>
```

Primary trigger and named menu — use `primary` to apply primary button styling to the trigger, and `menuName` to add a visible label next to the trigger icon:

```vue
<template>
  <div style="display: flex; align-items: center; gap: 12px;">
    <CnRowActions
      :actions="actions"
      :row="row"
      :primary="true"
      menu-name="Actions" />
  </div>
</template>
<script>
import Pencil from 'vue-material-design-icons/Pencil.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
export default {
  data() {
    return {
      row: { id: 1, title: 'Sample item' },
      actions: [
        { label: 'Edit', icon: Pencil, handler: () => {} },
        { label: 'Delete', icon: TrashCanOutline, destructive: true, handler: () => {} },
      ],
    }
  },
}
</script>
```

Conditional visibility — hide actions based on row state:

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div v-for="item in items" :key="item.id" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1px solid var(--color-border); border-radius: 6px;">
      <span>{{ item.title }} <CnStatusBadge :label="item.status" :color-map="{ active: 'success', archived: 'default' }" size="small" /></span>
      <CnRowActions :actions="rowActions" :row="item" />
    </div>
  </div>
</template>
<script>
import ArchiveArrowDown from 'vue-material-design-icons/ArchiveArrowDown.vue'
import ArchiveArrowUp from 'vue-material-design-icons/ArchiveArrowUp.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
export default {
  data() {
    return {
      items: [
        { id: 1, title: 'Report Q1', status: 'active' },
        { id: 2, title: 'Report Q4', status: 'archived' },
      ],
      rowActions: [
        {
          label: 'Archive',
          icon: ArchiveArrowDown,
          visible: (row) => row.status === 'active',
          handler: (row) => { row.status = 'archived' },
        },
        {
          label: 'Restore',
          icon: ArchiveArrowUp,
          visible: (row) => row.status === 'archived',
          handler: (row) => { row.status = 'active' },
        },
        {
          label: 'Delete',
          icon: TrashCanOutline,
          destructive: true,
          title: (row) => row.status === 'active' ? 'Archive before deleting' : '',
          disabled: (row) => row.status === 'active',
          handler: () => {},
        },
      ],
    }
  },
}
</script>
```
