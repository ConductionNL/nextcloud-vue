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
| `items` | Array | `[]` | Items to export |
| `formats` | Array | `['json', 'csv']` | Available export formats |
| `dialogTitle` | String | `'Export items'` | |
| `confirmLabel` | String | `'Export'` | |
| `cancelLabel` | String | `'Cancel'` | |

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
