Bulk copy with naming pattern selector:

```vue
<template>
  <div>
    <NcButton @click="show = true">Copy 2 selected items</NcButton>
    <CnMassCopyDialog
      v-if="show"
      ref="massCopyDialog"
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
        { id: 1, title: 'Report Q1' },
        { id: 2, title: 'Report Q2' },
      ],
    }
  },
  methods: {
    async onConfirm({ ids, newNames }) {
      await new Promise(resolve => setTimeout(resolve, 800))
      this.$refs.massCopyDialog.setResult({ success: true, count: ids.length })
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
| `dialogTitle` | `'Copy items'` | Dialog title shown in the header. |
| `patternLabel` | `'Naming pattern'` | Label above the naming pattern dropdown. |
| `emptyText` | `'No items selected for copying.'` | Text shown when all items have been removed from the review list. |
| `successText` | `'Items successfully copied.'` | Message shown in the success note card. |
| `cancelLabel` | `'Cancel'` | Label for the dismiss button before the action is confirmed. |
| `closeLabel` | `'Close'` | Label for the dismiss button after the result is shown. |
| `confirmLabel` | `'Copy'` | Label for the confirm/copy button. |
| `removeLabel` | `'Remove from list'` | Aria-label for the per-item remove button (the × icon beside each item). |
