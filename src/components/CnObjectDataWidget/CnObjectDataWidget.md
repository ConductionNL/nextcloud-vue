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

With `icon`, `objectType`, `store`, `columns`, `overrides`, `exclude`, `include`, and custom labels:

```vue
<template>
  <div style="max-width: 700px;">
    <CnObjectDataWidget
      title="Character info"
      :icon="characterIcon"
      object-type="characters"
      :store="objectStore"
      :object-data="character"
      :schema="schema"
      :columns="4"
      :overrides="{
        name:        { order: 1, gridColumn: 2 },
        description: { order: 2, gridColumn: 4, gridRow: 2 },
        status:      { order: 3 },
        internalId:  { hidden: true },
      }"
      :exclude="['createdAt', 'updatedAt']"
      :include="['name', 'status', 'description', 'owner']"
      save-label="Save character"
      discard-label="Undo changes"
      empty-label="No properties to display"
      @saved="character = $event" />
  </div>
</template>
<script>
import DatabaseOutline from 'vue-material-design-icons/DatabaseOutline.vue'
export default {
  data() {
    return {
      characterIcon: DatabaseOutline,
      objectStore: null,   // pass your Pinia objectStore instance here
      character: { id: 'ch-1', name: 'Gandalf', status: 'active', description: 'Istari wizard', owner: 'Tolkien' },
      schema: {
        properties: {
          name:        { type: 'string', title: 'Name' },
          status:      { type: 'string', title: 'Status', enum: ['active', 'inactive'] },
          description: { type: 'string', title: 'Description' },
          owner:       { type: 'string', title: 'Owner', readOnly: true },
          internalId:  { type: 'string', title: 'Internal ID' },
          createdAt:   { type: 'string', title: 'Created' },
          updatedAt:   { type: 'string', title: 'Updated' },
        },
      },
    }
  },
}
</script>
```

## Additional props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | Object\|Function | `null` | MDI icon component shown in the card header |
| `objectType` | String | `''` | Registered object type slug used by `objectStore.saveObject()` |
| `store` | Object | `null` | Explicit Pinia objectStore instance; auto-detected via Pinia when omitted |
| `overrides` | Object | `{}` | Per-property config: `{ key: { order, gridColumn, gridRow, hidden, editable, label, widget } }` |
| `columns` | Number | `3` | Number of CSS grid columns in the widget |
| `exclude` | Array | `[]` | Property keys to hide |
| `include` | Array | `null` | Property keys to show (whitelist; shows all when `null`) |
| `saveLabel` | String | `'Save'` | Label for the save button |
| `discardLabel` | String | `'Discard'` | Label for the discard button |
| `emptyLabel` | String | `'No data available'` | Label shown when no properties are displayable |
