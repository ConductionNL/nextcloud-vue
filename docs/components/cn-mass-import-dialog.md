---
sidebar_position: 22
---

# CnMassImportDialog

File upload dialog with options and results summary. Supports importing data from files into OpenRegister.

**Wraps**: NcDialog, NcButton

![CnMassImportDialog showing file upload with supported formats list](/img/screenshots/cn-mass-import-dialog.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dialogTitle` | String | `'Import data'` | |
| `acceptedTypes` | String | `'.json,.xlsx,.xls,.csv'` | Accepted file types (input `accept` attribute) |
| `options` | Array | `[]` | Additional import option definitions |
| `fileTypeHelp` | Array | `[{ label, description }]` | Help entries shown in the "Supported file types" list; defaults to JSON, Excel, and CSV entries |
| `canSubmit` | Boolean | `true` | Whether the form is ready to submit. The parent can set this to `false` (via a slot) while required options are incomplete. |
| `successText` | String | `'Import completed successfully!'` | Message shown in the result phase when all rows imported without errors |
| `partialSuccessText` | String | `'Import completed with errors. Check the details below.'` | Message shown when the import finished but with some errors |
| `loadingText` | String | `'Importing data — this may take a moment for large files...'` | Text shown while the import is running |
| `summaryTitle` | String | `'Import summary'` | Heading above the result summary table |
| `supportedFormatsLabel` | String | `'Supported file types:'` | Label above the file type help list |
| `selectFileLabel` | String | `'Select file'` | Label for the file-picker button |
| `cancelLabel` | String | `'Cancel'` | |
| `closeLabel` | String | `'Close'` | Label for the close button shown in the result phase |
| `confirmLabel` | String | `'Import'` | |
| `sheetLabel` | String | `'Sheet'` | Column header for the sheet name in the summary table |
| `foundLabel` | String | `'Found'` | Column header for the found-rows count |
| `createdLabel` | String | `'Created'` | Column header for the created-rows count |
| `updatedLabel` | String | `'Updated'` | Column header for the updated-rows count |
| `unchangedLabel` | String | `'Unchanged'` | Column header for the unchanged-rows count |
| `errorsLabel` | String | `'Errors'` | Column header for the error count |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `\{ file, options \}` | Import confirmed |
| `close` | — | Dialog closed |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `#import-fields` | `\{ file \}` | Extra fields below file upload |

## Public Methods

| Method | Description |
|--------|-------------|
| `setResult(\{ success?, error?, imported?, skipped? \})` | Set import result |

## Live demo

```vue
<template>
  <div>
    <button @click="open = true" style="padding: 6px 16px; border-radius: 4px; background: var(--color-primary-element); color: white; border: none; cursor: pointer;">Import</button>
    <CnMassImportDialog
      v-if="open"
      ref="dlg"
      @confirm="onConfirm"
      @close="open = false" />
  </div>
</template>
<script>
export default {
  data() { return { open: false } },
  methods: {
    async onConfirm(payload) {
      await new Promise(r => setTimeout(r, 800))
      this.$refs.dlg.setResult({ success: true })
    },
  },
}
</script>
```

## Usage

```vue {static}
<CnMassImportDialog
  accepted-types=".json,.csv,.xlsx"
  @confirm="onImport"
  @close="showImport = false">
  <template #import-fields="{ file }">
    <NcCheckboxRadioSwitch v-model="overwriteExisting">
      Overwrite existing records
    </NcCheckboxRadioSwitch>
  </template>
</CnMassImportDialog>
```
