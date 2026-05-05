Schema-driven editable grid — click any field to edit inline, save when ready:

```vue
<template>
  <div style="max-width: 600px;">
    <CnObjectDataWidget
      title="Contact details"
      :object-data="contact"
      :schema="schema"
      @save="onSave" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      contact: {
        id: 'c-001',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+31 6 12 34 56 78',
        status: 'active',
        notes: 'Key account contact',
      },
      schema: {
        properties: {
          name: { type: 'string', title: 'Full name' },
          email: { type: 'string', title: 'Email', format: 'email' },
          phone: { type: 'string', title: 'Phone' },
          status: { type: 'string', title: 'Status', enum: ['active', 'inactive', 'pending'] },
          notes: { type: 'string', title: 'Notes', contentMediaType: 'text/plain' },
        },
      },
    }
  },
  methods: {
    async onSave({ objectData, changes }) {
      await new Promise(resolve => setTimeout(resolve, 600))
      Object.assign(this.contact, changes)
    },
  },
}
</script>
```

Read-only mode — no inline editing:

```vue
<div style="max-width: 500px;">
  <CnObjectDataWidget
    title="Invoice details (read-only)"
    :object-data="{ id: 'inv-001', customer: 'Acme Corp', amount: 1250, currency: 'EUR', status: 'paid' }"
    :schema="{
      properties: {
        customer: { type: 'string', title: 'Customer' },
        amount: { type: 'number', title: 'Amount' },
        currency: { type: 'string', title: 'Currency' },
        status: { type: 'string', title: 'Status', enum: ['draft', 'sent', 'paid', 'overdue'] },
      },
    }"
    :editable="false" />
</div>
```
