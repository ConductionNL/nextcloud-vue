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

Custom dialog title and name formatter:

```vue
<template>
  <div>
    <NcButton @click="show = true">Duplicate Jane Smith</NcButton>
    <CnCopyDialog
      v-if="show"
      ref="copyDialog"
      :item="item"
      dialog-title="Duplicate contact"
      :name-formatter="item => `${item.firstName} ${item.lastName}`"
      @confirm="onConfirm"
      @close="show = false" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      show: false,
      item: { id: 7, firstName: 'Jane', lastName: 'Smith' },
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

## Label customization

All user-visible strings have props so they can be pre-translated by the consumer app.

| Prop | Default (English) | Description |
|---|---|---|
| `nameFormatter` | `null` | Optional function `(item) => string` to format the displayed item name. Overrides `nameField` when provided. |
| `dialogTitle` | `'Copy item'` | Dialog title shown in the header. |
| `patternLabel` | `'Naming pattern'` | Label above the naming pattern dropdown. |
| `successText` | `'Item successfully copied.'` | Message shown in the success note card after copying. |
| `cancelLabel` | `'Cancel'` | Label for the dismiss button before the action is confirmed. |
| `closeLabel` | `'Close'` | Label for the dismiss button after the result is shown. |
| `confirmLabel` | `'Copy'` | Label for the confirm/copy button. |
