---
sidebar_position: 16
---

# CnDeleteDialog

Two-phase single-item delete confirmation dialog. Shows a warning, waits for API response, then shows success or error.

**Wraps**: NcDialog, NcButton, NcNoteCard, NcLoadingIcon

![CnDeleteDialog confirmation dialog with warning text and Cancel/Delete buttons](/img/screenshots/cn-delete-dialog.png)

![CnDeleteDialog confirmation with warning text and Cancel/Delete buttons](/img/screenshots/cn-delete-dialog.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `item` | Object | *(required)* | Item to delete (must have id) |
| `nameField` | String | `'title'` | Field used as display name |
| `dialogTitle` | String | `'Delete Item'` | |
| `warningText` | String | `'Are you sure...'` | Supports `\{name\}` placeholder |
| `successText` | String | `'Item successfully deleted.'` | |
| `cancelLabel` | String | | Cancel button label |
| `closeLabel` | String | | Close button label |
| `confirmLabel` | String | | Confirm button label |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `id` | Delete confirmed by user |
| `close` | — | Dialog closed |

## Public Methods

| Method | Description |
|--------|-------------|
| `setResult(\{ success?, error? \})` | Set operation result after API call |

## Two-Phase Pattern

```vue
<template>
  <CnDeleteDialog
    v-if="deleteItem"
    ref="deleteDialog"
    :item="deleteItem"
    @confirm="onDeleteConfirm"
    @close="deleteItem = null" />
</template>

<script>
export default {
  methods: {
    async onDeleteConfirm(id) {
      try {
        await api.delete(id)
        this.$refs.deleteDialog.setResult({ success: true })
      } catch (error) {
        this.$refs.deleteDialog.setResult({ error: error.message })
      }
    },
  },
}
</script>
```
