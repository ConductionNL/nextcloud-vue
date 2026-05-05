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
