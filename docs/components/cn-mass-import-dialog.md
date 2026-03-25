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
| `dialogTitle` | String | `'Import items'` | |
| `acceptedTypes` | String | `'.json,.csv'` | Accepted file types |
| `options` | Array | `[]` | Additional import options |
| `confirmLabel` | String | `'Import'` | |
| `cancelLabel` | String | `'Cancel'` | |
| `maxFileSize` | Number | `10485760` | Max file size in bytes (10MB default) |

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

## Usage

```vue
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
