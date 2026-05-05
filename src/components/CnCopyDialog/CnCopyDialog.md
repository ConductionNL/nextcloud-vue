Two-phase flow: naming pattern selection → result. Call `setResult()` via ref after the API call:

```vue
<template>
  <div>
    <NcButton @click="show = true">Copy item</NcButton>
    <CnCopyDialog
      v-if="show"
      ref="copyDialog"
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
      item: { id: 5, title: 'Report Q1 2024' },
    }
  },
  methods: {
    async onConfirm({ id, newName }) {
      await new Promise(resolve => setTimeout(resolve, 800))
      this.$refs.copyDialog.setResult({ success: true })
    },
  },
}
</script>
```

Custom patterns — override the naming options shown in the dropdown:

```vue
<template>
  <div>
    <NcButton @click="show = true">Copy with custom patterns</NcButton>
    <CnCopyDialog
      v-if="show"
      ref="copyDialog"
      :item="item"
      name-field="title"
      :naming-patterns="[
        { label: 'Copy of {name}', value: 'Copy of {name}' },
        { label: '{name} (backup)', value: '{name} (backup)' },
        { label: '{name} — draft', value: '{name} — draft' },
      ]"
      @confirm="onConfirm"
      @close="show = false" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      show: false,
      item: { id: 10, title: 'Schema v2' },
    }
  },
  methods: {
    async onConfirm({ id, newName }) {
      await new Promise(resolve => setTimeout(resolve, 600))
      this.$refs.copyDialog.setResult({ success: true })
    },
  },
}
</script>
```
