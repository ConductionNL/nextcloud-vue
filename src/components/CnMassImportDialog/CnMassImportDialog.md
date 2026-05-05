Bulk import with file upload:

```vue
<template>
  <div>
    <NcButton @click="show = true">Import items</NcButton>
    <CnMassImportDialog
      v-if="show"
      ref="importDialog"
      @confirm="onConfirm"
      @close="show = false" />
  </div>
</template>
<script>
export default {
  data() {
    return { show: false }
  },
  methods: {
    async onConfirm({ file, format }) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      this.$refs.importDialog.setResult({ success: true, count: 12 })
    },
  },
}
</script>
```

## Additional props

### Functional props

| Prop | Default | Description |
|---|---|---|
| `dialogTitle` | `'Import data'` | Dialog title shown in the header. |
| `acceptedTypes` | `'.json,.xlsx,.xls,.csv'` | The `accept` attribute passed to the hidden file input. |
| `options` | `[]` | Import option definitions rendered as toggle switches. Each entry: `{ key, label, description?, default? }`. |
| `fileTypeHelp` | JSON/Excel/CSV entries | Array of `{ label, description }` explaining the supported file types. Pass an empty array to hide the help section. |
| `canSubmit` | `true` | Whether the Import button is enabled. Use this when a required slot field (e.g., schema selector) has not yet been filled in. |

### Label customization

All user-visible strings have props so they can be pre-translated by the consumer app.

| Prop | Default (English) | Description |
|---|---|---|
| `successText` | `'Import completed successfully!'` | Message when all rows imported without errors. |
| `partialSuccessText` | `'Import completed with errors. Check the details below.'` | Message when import partially succeeded. |
| `loadingText` | `'Importing data — this may take a moment for large files...'` | Info card shown while the import is running. |
| `summaryTitle` | `'Import summary'` | Heading above the results table. |
| `supportedFormatsLabel` | `'Supported file types:'` | Bold heading inside the file type help block. |
| `selectFileLabel` | `'Select file'` | Label on the file-picker button. |
| `cancelLabel` | `'Cancel'` | Label for the dismiss button before the action is confirmed. |
| `closeLabel` | `'Close'` | Label for the dismiss button after the result is shown. |
| `confirmLabel` | `'Import'` | Label for the confirm/import button. |
| `sheetLabel` | `'Sheet'` | Column header in the results summary table. |
| `foundLabel` | `'Found'` | Column header for the found-rows count. |
| `createdLabel` | `'Created'` | Column header for the created-rows count. |
| `updatedLabel` | `'Updated'` | Column header for the updated-rows count. |
| `unchangedLabel` | `'Unchanged'` | Column header for the unchanged-rows count. |
| `errorsLabel` | `'Errors'` | Column header for the error-rows count. |
