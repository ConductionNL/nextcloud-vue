CnDetailPage is the generic detail/overview page with stats, cards, and flexible content slots.

Full example with header, stats, and data card:

```vue
<template>
  <div style="height: 500px; overflow: auto; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px;">
    <CnDetailPage
      :object="contact"
      :schema="schema"
      :loading="false"
      title="Jane Smith"
      description="Active contact">
      <template #header-actions>
        <NcButton @click="last = 'edit'">Edit</NcButton>
      </template>
      <template #default>
        <CnDetailCard title="Contact information">
          <CnDetailGrid :items="[
            { label: 'Email', value: contact.email },
            { label: 'Phone', value: contact.phone },
            { label: 'Company', value: contact.company },
            { label: 'Status', value: contact.status },
          ]" layout="horizontal" />
        </CnDetailCard>
      </template>
      <template #sidebar>
        <CnObjectMetadataWidget
          :object-data="contact"
          :include="['id', 'created', 'updated']" />
      </template>
    </CnDetailPage>
  </div>
</template>
<script>
export default {
  data() {
    return {
      last: '',
      contact: {
        id: 1,
        uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        email: 'jane@example.com',
        phone: '+31 6 12 34 56 78',
        company: 'Acme Corp',
        status: 'active',
        created: '2024-01-10T09:00:00Z',
        updated: '2024-03-15T14:30:00Z',
      },
      schema: {
        properties: {
          email: { type: 'string', title: 'Email' },
          phone: { type: 'string', title: 'Phone' },
          company: { type: 'string', title: 'Company' },
          status: { type: 'string', title: 'Status', enum: ['active', 'inactive'] },
        },
      },
    }
  },
}
</script>
```
