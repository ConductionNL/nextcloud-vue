CnRegisterMapping is a settings component for mapping application entity types to Open Register registers and schemas. It loads available registers from the API and lets admins configure which register/schema each entity type uses.

It is normally placed on an admin settings page:

```vue
<template>
  <CnRegisterMapping
    name="Data mapping"
    description="Configure which registers and schemas are used for each data type"
    :groups="groups"
    :mappings="mappings"
    :show-save-button="true"
    @save="onSave"
    @change="mappings = $event" />
</template>
<script>
export default {
  data() {
    return {
      mappings: {},
      groups: [
        {
          name: 'Contacts',
          description: 'Contact-related data types',
          types: [
            { key: 'person', label: 'Person', description: 'Individual person contacts' },
            { key: 'organisation', label: 'Organisation', description: 'Company or organisation contacts' },
          ],
        },
        {
          name: 'Documents',
          description: 'Document management types',
          types: [
            { key: 'publication', label: 'Publication', description: 'Public documents and reports' },
          ],
        },
      ],
    }
  },
  methods: {
    onSave(mappings) {
      console.log('Saving mappings:', mappings)
    },
  },
}
</script>
```
