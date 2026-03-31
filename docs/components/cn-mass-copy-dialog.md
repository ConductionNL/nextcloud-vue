---
sidebar_position: 20
---

# CnMassCopyDialog

Two-phase mass copy dialog with naming pattern. Allows users to define a naming pattern for copied items.

**Wraps**: NcDialog, NcButton, NcTextField

![CnMassCopyDialog showing bulk copy with naming pattern and item list](/img/screenshots/cn-mass-copy-dialog.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | Array | `[]` | Items to copy (`[\{ id, name \}]`) |
| `nameField` | String | `'title'` | Field to display as item name |
| `nameFormatter` | Function | `null` | Optional function `(item) => string` to format item names. Overrides `nameField` when provided. |
| `dialogTitle` | String | `'Copy items'` | |
| `patternLabel` | String | `'Naming pattern'` | |
| `patternPlaceholder` | String | `'\{name\} (copy)'` | |
| `confirmLabel` | String | `'Copy'` | |
| `cancelLabel` | String | `'Cancel'` | |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `\{ ids, pattern \}` | Copy confirmed |
| `close` | — | Dialog closed |

## Public Methods

| Method | Description |
|--------|-------------|
| `setResult(\{ success?, error?, results? \})` | Set result per item |

## Usage

```vue
<CnMassCopyDialog
  ref="massCopyDialog"
  :items="selectedItems"
  @confirm="onMassCopy"
  @close="showMassCopy = false" />
```
