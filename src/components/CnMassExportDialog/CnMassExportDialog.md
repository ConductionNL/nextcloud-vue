Bulk export with format selection:

```vue
<template>
  <div>
    <NcButton @click="show = true">Export 5 items</NcButton>
    <CnMassExportDialog
      v-if="show"
      ref="exportDialog"
      :items="selectedItems"
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
        { id: 1, title: 'Record A' },
        { id: 2, title: 'Record B' },
        { id: 3, title: 'Record C' },
        { id: 4, title: 'Record D' },
        { id: 5, title: 'Record E' },
      ],
    }
  },
  methods: {
    async onConfirm({ ids, format }) {
      await new Promise(resolve => setTimeout(resolve, 600))
      this.$refs.exportDialog.setResult({ success: true })
    },
  },
}
</script>
```
