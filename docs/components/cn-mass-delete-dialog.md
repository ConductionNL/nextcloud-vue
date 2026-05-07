---
sidebar_position: 19
---

# CnMassDeleteDialog

Two-phase mass delete confirmation dialog. Shows list of items to delete, requires confirmation, and displays results.

**Wraps**: NcDialog, NcButton, NcNoteCard

![CnMassDeleteDialog showing confirmation with list of items to delete](/img/screenshots/cn-mass-delete-dialog.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | Array | `[]` | Items to delete (`[\{ id, name \}]`) |
| `nameField` | String | `'title'` | Field to display as item name |
| `nameFormatter` | Function | `null` | Optional function `(item) => string` to format item names. Overrides `nameField` when provided. |
| `dialogTitle` | String | `'Delete items'` | |
| `warningText` | String | `''` | Warning text shown above the item list |
| `emptyText` | String | `'No items selected for deletion.'` | Message shown when all items have been removed from the list |
| `successText` | String | `'Items successfully deleted.'` | Message shown in the result phase on success |
| `cancelLabel` | String | `'Cancel'` | |
| `closeLabel` | String | `'Close'` | Label for the close button shown in the result phase |
| `confirmLabel` | String | `'Delete'` | |
| `removeLabel` | String | `'Remove from list'` | Tooltip/label for the per-item remove button |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `ids[]` | Deletion confirmed |
| `close` | — | Dialog closed |

## Public Methods

| Method | Description |
|--------|-------------|
| `setResult(\{ success?, error?, results? \})` | Set result per item |

## Live demo

```vue
<template>
  <div>
    <button @click="open = true" style="padding: 6px 16px; border-radius: 4px; background: var(--color-primary-element); color: white; border: none; cursor: pointer;">Delete selected (2)</button>
    <CnMassDeleteDialog
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
    async onConfirm(ids) {
      await new Promise(r => setTimeout(r, 800))
      this.$refs.dlg.setResult({ success: true })
    },
  },
}
</script>
```

## Usage

```vue {static}
<CnMassDeleteDialog
  ref="massDeleteDialog"
  :items="selectedItems"
  @confirm="onMassDelete"
  @close="showMassDelete = false" />
```

### Custom name formatting

Use `nameFormatter` when items don't have a simple name field:

```vue {static}
<CnMassDeleteDialog
  :items="selectedAuditTrails"
  :name-formatter="(item) => t('myapp', 'Audit Trail #{id}', { id: item.id })"
  @confirm="onMassDelete"
  @close="showMassDelete = false" />
```
