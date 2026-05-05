CnMassActionBar is only visible when `count > 0`. It renders as a single dropdown button:

```vue
<template>
  <div>
    <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
      <NcButton type="secondary" @click="count = Math.max(0, count - 1)">- Deselect</NcButton>
      <NcButton type="primary" @click="count++">+ Select</NcButton>
      <span style="align-self: center; font-size: 13px;">{{ count }} selected</span>
    </div>
    <CnMassActionBar
      :count="count"
      :selected-ids="Array.from({ length: count }, (_, i) => `id-${i}`)"
      @mass-copy="last = 'copy'"
      @mass-delete="last = 'delete'"
      @mass-export="last = 'export'"
      @mass-import="last = 'import'" />
    <p style="font-size: 13px; margin-top: 8px;">Last action: {{ last || '—' }}</p>
  </div>
</template>
<script>
export default {
  data() { return { count: 3, last: '' } }
}
</script>
```

With custom mass actions via slot:

```vue
<template>
  <CnMassActionBar
    :count="5"
    :selected-ids="['a', 'b', 'c', 'd', 'e']"
    :show-copy="false"
    :show-import="false">
    <template #actions="{ count, selectedIds }">
      <NcActionButton @click="last = `Publish ${count} items`">
        <template #icon>
          <PublishIcon :size="20" />
        </template>
        Publish
      </NcActionButton>
      <NcActionButton @click="last = `Archive ${count} items`">
        <template #icon>
          <ArchiveIcon :size="20" />
        </template>
        Archive
      </NcActionButton>
    </template>
  </CnMassActionBar>
  <p style="font-size: 13px; margin-top: 8px;">{{ last || '—' }}</p>
</template>
<script>
import CloudUploadOutline from 'vue-material-design-icons/CloudUploadOutline.vue'
import ArchiveArrowDown from 'vue-material-design-icons/ArchiveArrowDown.vue'
export default {
  data() {
    return {
      last: '',
      PublishIcon: CloudUploadOutline,
      ArchiveIcon: ArchiveArrowDown,
    }
  },
}
</script>
```
