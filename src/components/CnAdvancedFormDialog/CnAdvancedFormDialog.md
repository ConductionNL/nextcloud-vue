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

## Additional props

### Functional props

| Prop | Default | Description |
|---|---|---|
| `dialogTitle` | `''` | Dialog title. Defaults to `'Create {schema.title}'` or `'Edit {schema.title}'` when empty. |
| `nameField` | `'title'` | Which field is the "name" of the item (used in result messages). |
| `excludeFields` | `[]` | Array of field keys to exclude from the properties table and form. |
| `includeFields` | `null` | Array of field keys to include (whitelist mode). Null means all fields. |
| `fieldOverrides` | `{}` | Per-field override objects passed to `fieldsFromSchema`. |
| `showPropertiesTable` | `true` | Show or hide the Properties tab. |
| `showJsonTab` | `true` | Show or hide the Data (JSON) tab. |
| `showMetadataTab` | `null` | Show or hide the Metadata tab. Defaults to `true` in edit mode, `false` in create mode. |
| `editablePropertyTypes` | `null` | Array of JSON Schema types for which inline editing is enabled. Defaults to all supported types. |
| `validationDisplay` | `'indicator'` | How to show property validation state — `'indicator'` or `'none'`. |
| `jsonEditorDark` | `false` | Enable dark mode in the CodeMirror JSON editor. |

### Slots

| Slot | Description |
|---|---|
| `register-schema-selection` | When provided, replaces the default tabbed layout entirely. Useful for a multi-step wizard where register/schema must be chosen before editing. |
| `tab-properties` | Override the default Properties tab content. Scoped: `{ formData, updateField, objectProperties, selectedProperty, getPropertyDisplayName, getPropertyValidationClass, isPropertyEditable, validationDisplay }`. |
| `tab-metadata` | Override the default Metadata tab content. Scoped: `{ item, formData }`. |
| `tab-data` | Override the default Data (JSON) tab content. Scoped: `{ jsonData, updateJson, isValid, formatJson }`. |
| `form` | Replace the entire dialog form area. Scoped: `{ formData, updateField, objectProperties, jsonData, updateJson, isValidJson }`. |

### Label customization

All user-visible strings have props so they can be pre-translated by the consumer app.

| Prop | Default (English) | Description |
|---|---|---|
| `successText` | `'{title} saved successfully.'` | Message shown after a successful save. |
| `cancelLabel` | `'Cancel'` | Label for the dismiss button before the action is confirmed. |
| `closeLabel` | `'Close'` | Label for the dismiss button after the result is shown. |
| `confirmLabel` | `''` | Confirm button label. Defaults to `'Create'` or `'Save'` depending on mode. |
