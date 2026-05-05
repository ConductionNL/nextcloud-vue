Bulk export with format selection:

```vue
<template>
  <div>
    <NcButton @click="show = true">Export 5 items</NcButton>
    <CnMassExportDialog
      v-if="show"
      ref="exportDialog"
      :items="selectedItems"
      @confirm="onConfirm"
      @close="show = false" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      show: false,
      selectedItems: [
        { id: 1, title: 'Record A' },
        { id: 2, title: 'Record B' },
        { id: 3, title: 'Record C' },
        { id: 4, title: 'Record D' },
        { id: 5, title: 'Record E' },
      ],
    }
  },
  methods: {
    async onConfirm({ ids, format }) {
      await new Promise(resolve => setTimeout(resolve, 600))
      this.$refs.exportDialog.setResult({ success: true })
    },
  },
}
</script>
```

## Additional props

### Functional props

| Prop | Default | Description |
|---|---|---|
| `dialogTitle` | `'Export objects'` | Dialog title shown in the header. |
| `description` | `''` | Optional description text shown above the format selector (e.g., `'Export 42 objects from Cases'`). |
| `formats` | `[{ id: 'excel', label: 'Excel (.xlsx)' }, { id: 'csv', label: 'CSV (.csv)' }]` | Available export format options. Each entry must have `id` and `label`. |
| `defaultFormat` | `'excel'` | The `id` of the format that is pre-selected when the dialog opens. |

### Label customization

All user-visible strings have props so they can be pre-translated by the consumer app.

| Prop | Default (English) | Description |
|---|---|---|
| `successText` | `'Export completed successfully.'` | Message shown in the success note card. |
| `formatLabel` | `'Export format'` | Label above the format dropdown. |
| `cancelLabel` | `'Cancel'` | Label for the dismiss button before the action is confirmed. |
| `closeLabel` | `'Close'` | Label for the dismiss button after the result is shown. |
| `confirmLabel` | `'Export'` | Label for the confirm/export button. |
