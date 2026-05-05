---
sidebar_position: 16
---

# CnDeleteDialog

Two-phase single-item delete confirmation dialog. Shows a warning, waits for API response, then shows success or error.

**Wraps**: NcDialog, NcButton, NcNoteCard, NcLoadingIcon

![CnDeleteDialog confirmation dialog with warning text and Cancel/Delete buttons](/img/screenshots/cn-delete-dialog.png)

![CnDeleteDialog confirmation with warning text and Cancel/Delete buttons](/img/screenshots/cn-delete-dialog.png)

## Live demo

```vue
<template>
  <div>
    <button @click="open = true" style="padding: 6px 16px; border-radius: 4px; background: var(--color-primary-element); color: white; border: none; cursor: pointer;">Delete item</button>
    <CnDeleteDialog
      v-if="open"
      ref="dlg"
      :item="{ id: 1, title: 'Annual Report 2024' }"
      @confirm="onConfirm"
      @close="open = false" />
  </div>
</template>
<script>
export default {
  data() { return { open: false } },
  methods: {
    async onConfirm(id) {
      await new Promise(r => setTimeout(r, 800))
      this.$refs.dlg.setResult({ success: true })
    },
  },
}
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `item` | Object | *(required)* | Item to delete (must have id) |
| `nameField` | String | `'title'` | Field used as display name |
| `nameFormatter` | Function | `null` | Optional function `(item) => string` to format the display name. Overrides `nameField` when provided. |
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

## Custom Name Formatting

When items don't have a simple name field, use `nameFormatter` to build a display name from any item properties:

```vue {static}
<CnDeleteDialog
  :item="auditTrail"
  :name-formatter="(item) => t('myapp', 'Audit Trail #{id}', { id: item.id })"
  @confirm="onDeleteConfirm"
  @close="deleteItem = null" />
```

## Two-Phase Pattern

```vue {static}
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
