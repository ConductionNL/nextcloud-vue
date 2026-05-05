CnSchemaFormDialog is the full-featured JSON Schema editor with Properties, Configuration, and Security tabs.

Basic — create a new schema:

```vue
<template>
  <div>
    <NcButton type="primary" @click="show = true">New schema</NcButton>
    <CnSchemaFormDialog
      v-if="show"
      :schema="null"
      :available-registers="registers"
      @save="onSave"
      @close="show = false" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      show: false,
      registers: [
        { id: 'reg-1', title: 'Contacts register' },
        { id: 'reg-2', title: 'Products register' },
      ],
    }
  },
  methods: {
    onSave(schemaData) {
      console.log('Saved schema:', schemaData)
      this.show = false
    },
  },
}
</script>
```

Edit mode — pre-populate with existing schema:

```vue
<template>
  <div>
    <NcButton @click="show = true">Edit schema</NcButton>
    <CnSchemaFormDialog
      v-if="show"
      :schema="schema"
      :available-registers="registers"
      :show-delete="true"
      @save="onSave"
      @delete="onDelete"
      @close="show = false" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      show: false,
      registers: [{ id: 'reg-1', title: 'Main register' }],
      schema: {
        id: 'schema-001',
        title: 'Contact',
        description: 'A person or organisation contact record',
        properties: {
          name: { type: 'string', title: 'Full name' },
          email: { type: 'string', title: 'Email', format: 'email' },
          phone: { type: 'string', title: 'Phone' },
          status: { type: 'string', title: 'Status', enum: ['active', 'inactive'] },
        },
        required: ['name'],
      },
    }
  },
  methods: {
    onSave(data) { this.show = false },
    onDelete() { this.show = false },
  },
}
</script>
```
