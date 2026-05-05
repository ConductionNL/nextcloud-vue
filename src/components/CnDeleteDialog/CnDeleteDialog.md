Two-phase flow: confirm → result. The parent calls `setResult()` via a ref after the API call:

```vue
<template>
  <div>
    <NcButton type="error" @click="show = true">Delete item</NcButton>
    <CnDeleteDialog
      v-if="show"
      ref="deleteDialog"
      :item="item"
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
      item: { id: 42, title: 'Invoice #2024-001' },
    }
  },
  methods: {
    async onConfirm(id) {
      // Simulate an API call
      await new Promise(resolve => setTimeout(resolve, 800))
      // Then signal the result:
      this.$refs.deleteDialog.setResult({ success: true })
    },
  },
}
</script>
```

Custom name formatter — override how the item name is resolved:

```vue
<CnDeleteDialog
  v-if="show"
  ref="deleteDialog"
  :item="item"
  :name-formatter="item => `${item.firstName} ${item.lastName}`"
  @confirm="onConfirm"
  @close="show = false" />
```

Error result — call `setResult({ error: '...' })` on failure:

```vue
<template>
  <div>
    <NcButton type="error" @click="show = true">Delete (will fail)</NcButton>
    <CnDeleteDialog
      v-if="show"
      ref="deleteDialog"
      :item="item"
      dialog-title="Delete contact"
      warning-text='Are you sure you want to delete "{name}"? This will also remove all associated records.'
      @confirm="onConfirmFail"
      @close="show = false" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      show: false,
      item: { id: 1, title: 'Jane Smith' },
    }
  },
  methods: {
    async onConfirmFail() {
      await new Promise(resolve => setTimeout(resolve, 600))
      this.$refs.deleteDialog.setResult({ error: 'Permission denied: you cannot delete this contact.' })
    },
  },
}
</script>
```

## Label customization

All user-visible strings have props so they can be pre-translated by the consumer app via `registerTranslations()`.

| Prop | Default (English) | Description |
|---|---|---|
| `nameFormatter` | `null` | Optional function `(item) => string` to format the displayed item name. Overrides `nameField` when provided. |
| `successText` | `'Item successfully deleted.'` | Message shown in the success note card after deletion. |
| `cancelLabel` | `'Cancel'` | Label for the dismiss button before the action is confirmed. |
| `closeLabel` | `'Close'` | Label for the dismiss button after the result is shown. |
| `confirmLabel` | `'Delete'` | Label for the confirm/delete button. |
