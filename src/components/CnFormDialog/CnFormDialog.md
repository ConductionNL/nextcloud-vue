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

## Additional props

### Functional props

| Prop | Default | Description |
|---|---|---|
| `dialogTitle` | `''` | Dialog title. Defaults to `'Create {schema.title}'` or `'Edit {schema.title}'` when empty. |
| `excludeFields` | `[]` | Array of field keys to exclude from the auto-generated form. |
| `includeFields` | `null` | Array of field keys to include (whitelist mode). Null means all fields. |
| `fieldOverrides` | `{}` | Per-field override objects passed to `fieldsFromSchema`. |
| `nameField` | `'title'` | Which field is the "name" of the item (used in result messages). |
| `size` | `'normal'` | NcDialog size — `'small'`, `'normal'`, or `'large'`. |

### Slots

| Slot | Description |
|---|---|
| `before-fields` | Rendered before the first auto-generated field (after the `#form` slot check). Useful for adding introductory text or non-schema inputs. |
| `after-fields` | Rendered after the last auto-generated field. |
| `form` | Replace the entire auto-generated form. Scoped: `{ fields, formData, errors, updateField }`. |
| `field-{key}` | Replace a single auto-generated field. Scoped: `{ field, value, error, updateField }`. |
| `field-{key}-option` | Customize dropdown option rendering for a select/multiselect/tags field. |
| `field-{key}-selected-option` | Customize selected option display for a select/multiselect/tags field. |

### Label customization

All user-visible strings have props so they can be pre-translated by the consumer app.

| Prop | Default (English) | Description |
|---|---|---|
| `successText` | `'{title} saved successfully.'` | Message shown after a successful save. |
| `cancelLabel` | `'Cancel'` | Label for the dismiss button before the action is confirmed. |
| `closeLabel` | `'Close'` | Label for the dismiss button after the result is shown. |
| `confirmLabel` | `''` | Confirm button label. Defaults to `'Create'` or `'Save'` depending on mode. |

## Integration single-entity widgets (AD-18)

| Prop | Default | Description |
|---|---|---|
| `referenceContext` (`reference-context`) | `null` | Object context `{ register, schema, objectId }` forwarded to the integration single-entity widget rendered for fields that declare a `referenceType`. Optional. |
