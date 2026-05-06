CnRegisterMapping is a settings component for mapping application entity types to Open Register registers and schemas. It loads available registers from the API and lets admins configure which register/schema each entity type uses.

It is normally placed on an admin settings page:

```vue {static}
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

With `docUrl`, `configuration`, `saving`, `showReimportButton`, `reimporting`, `saveButtonText`, `reimportButtonText`, `autoMatch`, and `labels`:

```vue {static}
<template>
  <CnRegisterMapping
    name="Register configuration"
    description="Map each object type to an OpenRegister register and schema"
    doc-url="https://docs.example.com/register-mapping"
    :groups="groups"
    :configuration="config"
    :saving="isSaving"
    :show-reimport-button="true"
    :reimporting="isReimporting"
    save-button-text="Save configuration"
    reimport-button-text="Re-import data"
    :auto-match="true"
    :labels="{
      register: 'Register',
      schema: 'Schema',
      configured: 'Configured',
      notConfigured: 'Not configured',
      noSchemas: 'No schemas available',
      selectRegister: 'Select a register…',
      selectSchema: 'Select a schema…',
      allConfigured: 'All types configured',
      partiallyConfigured: 'configured',
    }"
    @save="saveConfig"
    @reimport="reimportData" />
</template>
<script>
export default {
  data() {
    return {
      isSaving: false,
      isReimporting: false,
      config: { register: '', contact_schema: '', organisation_schema: '' },
      groups: [
        {
          name: 'CRM objects',
          types: [
            { slug: 'contact',      label: 'Contact' },
            { slug: 'organisation', label: 'Organisation' },
          ],
        },
      ],
    }
  },
  methods: {
    async saveConfig(cfg) {
      this.isSaving = true
      await new Promise(r => setTimeout(r, 800))
      this.config = cfg
      this.isSaving = false
    },
    async reimportData() {
      this.isReimporting = true
      await new Promise(r => setTimeout(r, 1200))
      this.isReimporting = false
    },
  },
}
</script>
```

## Additional props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `docUrl` | String | `''` | Documentation URL — shows an info icon link next to the section title |
| `configuration` | Object | `{}` | Current config values: `{ register: '5', contact_schema: '28', … }` |
| `saving` | Boolean | `false` | Disables the save button and shows a spinner while saving is in progress |
| `showReimportButton` | Boolean | `false` | Show the re-import button alongside the save button |
| `reimporting` | Boolean | `false` | Disables the reimport button and shows a spinner while reimport is in progress |
| `saveButtonText` | String | `'Save configuration'` | Label for the save button |
| `reimportButtonText` | String | `'Re-import configuration'` | Label for the reimport button |
| `autoMatch` | Boolean | `true` | Automatically match schema titles to type slugs when a register is selected |
| `labels` | Object | *(see below)* | UI label overrides for all user-visible strings (register, schema, notConfigured, noSchemas, selectRegister, selectSchema, allConfigured, partiallyConfigured) |
