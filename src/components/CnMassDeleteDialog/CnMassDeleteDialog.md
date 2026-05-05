Bulk delete confirmation — two-phase flow like CnDeleteDialog, but for multiple items:

```vue
<template>
  <div>
    <NcButton type="error" @click="show = true">Delete 3 selected items</NcButton>
    <CnMassDeleteDialog
      v-if="show"
      ref="massDeleteDialog"
      :items="selectedItems"
      name-field="title"
      @confirm="onConfirm"
      @close="show = false" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      show: false,
      selectedItems: [
        { id: 1, title: 'Invoice #001' },
        { id: 2, title: 'Invoice #002' },
        { id: 3, title: 'Invoice #003' },
      ],
    }
  },
  methods: {
    async onConfirm(ids) {
      await new Promise(resolve => setTimeout(resolve, 800))
      this.$refs.massDeleteDialog.setResult({ success: true, count: ids.length })
    },
  },
}
</script>
```

## Label customization

All user-visible strings have props so they can be pre-translated by the consumer app.

| Prop | Default (English) | Description |
|---|---|---|
| `nameFormatter` | `null` | Optional function `(item) => string` to format each item's displayed name. Overrides `nameField` when provided. |
| `dialogTitle` | `'Delete items'` | Dialog title shown in the header. |
| `warningText` | `'The following items will be permanently deleted...'` | Warning text shown above the item list. |
| `emptyText` | `'No items selected for deletion.'` | Text shown when all items have been removed from the review list. |
| `successText` | `'Items successfully deleted.'` | Message shown in the success note card. |
| `cancelLabel` | `'Cancel'` | Label for the dismiss button before the action is confirmed. |
| `closeLabel` | `'Close'` | Label for the dismiss button after the result is shown. |
| `confirmLabel` | `'Delete'` | Label for the confirm/delete button. |
| `removeLabel` | `'Remove from list'` | Aria-label for the per-item remove button (the × icon beside each item). |
