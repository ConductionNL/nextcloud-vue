---
sidebar_position: 21
---

# CnMassExportDialog

Export format selection dialog. Lets users pick a format and triggers export for selected items.

**Wraps**: NcDialog, NcButton, NcSelect

![CnMassExportDialog showing export format selection](/img/screenshots/cn-mass-export-dialog.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dialogTitle` | String | `'Export objects'` | |
| `description` | String | `''` | Optional description text shown above the format selector |
| `formats` | Array | `[{ id: 'excel', label: 'Excel (.xlsx)' }, { id: 'csv', label: 'CSV (.csv)' }]` | Available export formats as `[{ id, label }]` objects |
| `defaultFormat` | String | `'excel'` | ID of the format selected by default |
| `successText` | String | `'Export completed successfully.'` | Message shown in the result phase on success |
| `formatLabel` | String | `'Export format'` | Label above the format selector |
| `cancelLabel` | String | `'Cancel'` | |
| `closeLabel` | String | `'Close'` | Label for the close button shown in the result phase |
| `confirmLabel` | String | `'Export'` | |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `\{ ids, format \}` | Export confirmed |
| `close` | — | Dialog closed |

## Public Methods

| Method | Description |
|--------|-------------|
| `setResult(\{ success?, error?, data? \})` | Set export result |

## Usage

```vue
<CnMassExportDialog
  :items="selectedItems"
  :formats="['json', 'csv', 'xlsx']"
  @confirm="onExport"
  @close="showExport = false" />
```
