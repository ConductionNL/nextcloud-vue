CnAdvancedFormDialog provides a richer editing experience with a properties table, JSON Data tab (CodeMirror), and optional Metadata tab.

Create mode — properties table with inline editing:

```vue
<template>
  <div>
    <NcButton type="primary" @click="show = true">Add object (advanced)</NcButton>
    <CnAdvancedFormDialog
      v-if="show"
      ref="dialog"
      :item="null"
      :schema="schema"
      @create="onCreate"
      @close="show = false" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      show: false,
      schema: {
        title: 'Publication',
        properties: {
          title: { type: 'string', title: 'Title' },
          status: { type: 'string', title: 'Status', enum: ['draft', 'published', 'archived'] },
          description: { type: 'string', title: 'Description', contentMediaType: 'text/plain' },
          version: { type: 'string', title: 'Version', default: '0.1.0' },
        },
        required: ['title'],
      },
    }
  },
  methods: {
    async onCreate(formData) {
      await new Promise(resolve => setTimeout(resolve, 600))
      this.$refs.dialog.setResult({ success: true })
    },
  },
}
</script>
```

Edit mode — pre-populated with existing object data:

```vue
<template>
  <div>
    <NcButton @click="show = true">Edit object (advanced)</NcButton>
    <CnAdvancedFormDialog
      v-if="show"
      ref="dialog"
      :item="item"
      :schema="schema"
      @edit="onEdit"
      @close="show = false" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      show: false,
      item: {
        id: 'obj-001',
        title: 'Open Register Guide',
        status: 'published',
        description: 'A guide to using Open Register.',
        version: '1.2.0',
      },
      schema: {
        title: 'Publication',
        properties: {
          title: { type: 'string', title: 'Title' },
          status: { type: 'string', title: 'Status', enum: ['draft', 'published', 'archived'] },
          description: { type: 'string', title: 'Description', contentMediaType: 'text/plain' },
          version: { type: 'string', title: 'Version' },
        },
      },
    }
  },
  methods: {
    async onEdit(formData) {
      await new Promise(resolve => setTimeout(resolve, 600))
      this.$refs.dialog.setResult({ success: true })
    },
  },
}
</script>
```
