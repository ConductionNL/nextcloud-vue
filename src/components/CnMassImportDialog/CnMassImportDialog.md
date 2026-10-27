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
| `templateUrl` | `''` | Address of an empty file with the right columns. When set, a "Download template" button sits beside the file picker. |
| `templateLabel` | `'Download template'` | Label of the template download button. |
| `mappingTitle` | `'How the columns are read'` | Heading of the column mapping table. |
| `columnLabel` | `'Column in the file'` | Header of the file column. |
| `fieldLabel` | `'Field'` | Header of the field column. |
| `notUsedLabel` | `'Not used'` | The choice that leaves a column out. |
| `checkFirstLabel` | `'Check first, import nothing yet'` | Label of the check-first switch. |
| `checkFirstDescription` | `'Shows which rows would fail and why.'` | Helper line of the check-first switch. |
| `checkedText` | `'Checked. Nothing is imported yet.'` | Note shown after a check. |
| `fields` | `[]` | The fields a row can fill, `[{ key, label }]`. With fields, a picked CSV or JSON file shows its rows and columns and a table that maps each column to a field or "Not used" (matched by key or label first). The file is uploaded with its columns renamed and the unused ones left out; the confirm payload carries the `mapping`. Excel files are uploaded as they are. |
| `checkFirst` | `false` | Offers "Check first, import nothing yet". On, the confirm options carry `dryRun: true`; pass the server's report to `setResult({ success, dryRun: true, summary })` and the dialog shows it with an Import button that sends the same file for real. |

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
