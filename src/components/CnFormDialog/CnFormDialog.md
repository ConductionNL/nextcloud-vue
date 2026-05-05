Create mode — `item` is null, fields generated from schema:

```vue
<template>
  <div>
    <NcButton type="primary" @click="show = true">Add contact</NcButton>
    <CnFormDialog
      v-if="show"
      ref="formDialog"
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
        title: 'Contact',
        properties: {
          name: { type: 'string', title: 'Full name', description: 'First and last name' },
          email: { type: 'string', title: 'Email', format: 'email' },
          phone: { type: 'string', title: 'Phone number' },
          status: {
            type: 'string',
            title: 'Status',
            enum: ['active', 'inactive', 'pending'],
            default: 'active',
          },
          notes: { type: 'string', title: 'Notes', description: 'Optional notes', contentMediaType: 'text/plain' },
        },
        required: ['name', 'email'],
      },
    }
  },
  methods: {
    async onCreate(formData) {
      await new Promise(resolve => setTimeout(resolve, 600))
      this.$refs.formDialog.setResult({ success: true })
    },
  },
}
</script>
```

Edit mode — pre-populate form with `item` data:

```vue
<template>
  <div>
    <NcButton @click="show = true">Edit contact</NcButton>
    <CnFormDialog
      v-if="show"
      ref="formDialog"
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
      item: { id: 1, name: 'Jane Smith', email: 'jane@example.com', status: 'active', notes: '' },
      schema: {
        title: 'Contact',
        properties: {
          name: { type: 'string', title: 'Full name' },
          email: { type: 'string', title: 'Email', format: 'email' },
          status: { type: 'string', title: 'Status', enum: ['active', 'inactive', 'pending'] },
          notes: { type: 'string', title: 'Notes', contentMediaType: 'text/plain' },
        },
        required: ['name', 'email'],
      },
    }
  },
  methods: {
    async onEdit(formData) {
      await new Promise(resolve => setTimeout(resolve, 600))
      this.$refs.formDialog.setResult({ success: true })
    },
  },
}
</script>
```
