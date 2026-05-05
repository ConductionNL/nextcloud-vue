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
