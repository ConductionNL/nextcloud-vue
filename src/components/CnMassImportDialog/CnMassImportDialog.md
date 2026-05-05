Bulk import with file upload:

```vue
<template>
  <div>
    <NcButton @click="show = true">Import items</NcButton>
    <CnMassImportDialog
      v-if="show"
      ref="importDialog"
      @confirm="onConfirm"
      @close="show = false" />
  </div>
</template>
<script>
export default {
  data() {
    return { show: false }
  },
  methods: {
    async onConfirm({ file, format }) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      this.$refs.importDialog.setResult({ success: true, count: 12 })
    },
  },
}
</script>
```
