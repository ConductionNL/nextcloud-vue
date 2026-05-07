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
| `emptyText` | String | `'No items selected for copying.'` | Message shown when all items have been removed from the list |
| `successText` | String | `'Items successfully copied.'` | Message shown in the result phase on success |
| `cancelLabel` | String | `'Cancel'` | |
| `closeLabel` | String | `'Close'` | Label for the close button shown in the result phase |
| `confirmLabel` | String | `'Copy'` | |
| `removeLabel` | String | `'Remove from list'` | Tooltip/label for the per-item remove button |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `\{ ids, pattern \}` | Copy confirmed |
| `close` | — | Dialog closed |

## Public Methods

| Method | Description |
|--------|-------------|
| `setResult(\{ success?, error?, results? \})` | Set result per item |

## Live demo

```vue
<template>
  <div>
    <button @click="open = true" style="padding: 6px 16px; border-radius: 4px; background: var(--color-primary-element); color: white; border: none; cursor: pointer;">Copy selected (2)</button>
    <CnMassCopyDialog
      v-if="open"
      ref="dlg"
      :items="[{ id: 1, title: 'Report A' }, { id: 2, title: 'Report B' }]"
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
<CnMassCopyDialog
  ref="massCopyDialog"
  :items="selectedItems"
  @confirm="onMassCopy"
  @close="showMassCopy = false" />
```
