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
import { NcButton } from '@nextcloud/vue'
export default {
  components: { NcButton },
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
import { NcActionButton } from '@nextcloud/vue'
import PublishIcon from 'vue-material-design-icons/CloudUploadOutline.vue'
import ArchiveIcon from 'vue-material-design-icons/ArchiveArrowDown.vue'
export default {
  components: { NcActionButton, PublishIcon, ArchiveIcon },
  data() {
    return { last: '' }
  },
}
</script>
```

Custom button label and action labels — override `menuLabelTemplate` and the individual action labels:

```vue
<CnMassActionBar
  :count="3"
  :selected-ids="['x', 'y', 'z']"
  menu-label-template="{count} items geselecteerd"
  import-label="Importeren"
  export-label="Exporteren"
  copy-label="Kopiëren"
  delete-label="Verwijderen"
  @mass-copy="() => {}"
  @mass-delete="() => {}"
  @mass-export="() => {}"
  @mass-import="() => {}" />
```

Hiding built-in actions — use `showExport` and `showDelete` to remove actions you don't need:

```vue
<CnMassActionBar
  :count="2"
  :selected-ids="['a', 'b']"
  :show-export="false"
  :show-delete="false"
  @mass-copy="() => {}"
  @mass-import="() => {}" />
```

## Additional props

| Prop | Type | Default | Description |
|---|---|---|---|
| `showExport` | `Boolean` | `true` | Whether to show the built-in Export action |
| `showDelete` | `Boolean` | `true` | Whether to show the built-in Delete action |
| `menuLabelTemplate` | `String` | `'Mass actions ({count})'` | Template for the dropdown button label; use `{count}` as a placeholder for the selection count |
| `importLabel` | `String` | `'Import'` | Label for the Import action item |
| `exportLabel` | `String` | `'Export'` | Label for the Export action item |
| `copyLabel` | `String` | `'Copy'` | Label for the Copy action item |
| `deleteLabel` | `String` | `'Delete'` | Label for the Delete action item |
