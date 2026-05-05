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

## Additional props

### Data and configuration

| Prop | Default | Description |
|---|---|---|
| `item` | `null` | Existing schema object for edit mode. Pass `null` for create mode. |
| `dialogTitle` | `''` | Dialog title. Defaults to `'Create Schema'` or `'Edit Schema'` when empty. |
| `size` | `'large'` | NcDialog size. |
| `availableSchemas` | `[]` | Schemas available for composition (allOf/oneOf/anyOf) and property references. Each entry: `{ id, title, description, reference }`. |
| `availableRegisters` | `[]` | Registers shown in the Configuration tab for field mapping. Each entry: `{ id, label }`. |
| `userGroups` | `[]` | User groups for RBAC in the Security tab. Each entry: `{ id, displayname }`. |
| `availableTags` | `[]` | Tags available for file property configuration. |
| `loadingGroups` | `false` | Whether user groups are still being loaded (shows a loading indicator in the Security tab). |
| `inheritedProperties` | `{}` | Properties inherited from parent schemas via allOf — shown as locked rows in the Properties tab. |
| `objectCount` | `0` | Number of objects attached to this schema; controls whether the Delete/Publish buttons are enabled. |

### Optional action buttons (edit mode only)

These buttons appear in the dialog footer when editing an existing schema.

| Prop | Default | Description |
|---|---|---|
| `showExtendSchema` | `false` | Show the "Extend schema" button. Emits `extend-schema` on click. |
| `showAnalyzeProperties` | `false` | Show the "Analyze properties" button. Emits `analyze-properties` on click. |
| `showValidateObjects` | `false` | Show the "Validate objects" button. Emits `validate-objects` on click. |
| `showDeleteObjects` | `false` | Show the "Delete objects" button. Disabled when `objectCount === 0`. Emits `delete-objects` on click. |
| `showPublishObjects` | `false` | Show the "Publish objects" button. Disabled when `objectCount === 0`. Emits `publish-objects` on click. |

### Label customization

All user-visible strings have props so they can be pre-translated by the consumer app.

| Prop | Default (English) | Description |
|---|---|---|
| `cancelLabel` | `'Cancel'` | Label for the dismiss button before the action is confirmed. |
| `closeLabel` | `'Close'` | Label for the dismiss button after the result is shown. |
| `confirmLabel` | `''` | Confirm button label. Defaults to `'Create'` or `'Save'` depending on mode. |
| `successText` | `'Schema saved successfully.'` | Message shown after a successful save. |
| `extendSchemaLabel` | `'Extend schema'` | Label for the Extend Schema action button. |
| `analyzePropertiesLabel` | `'Analyze properties'` | Label for the Analyze Properties action button. |
| `validateObjectsLabel` | `'Validate objects'` | Label for the Validate Objects action button. |
| `deleteObjectsLabel` | `'Delete objects'` | Label for the Delete Objects action button. |
| `publishObjectsLabel` | `'Publish objects'` | Label for the Publish Objects action button. |
| `deleteLabel` | `'Delete'` | Label for the Delete (schema) action button. |
| `deleteObjectsTooltip` | `'Delete all objects in this schema'` | Tooltip shown on the Delete Objects button when objects exist. |
| `publishObjectsTooltip` | `'Publish all objects in this schema'` | Tooltip shown on the Publish Objects button when objects exist. |
| `noDeleteObjectsTooltip` | `'No objects to delete'` | Tooltip shown on the Delete Objects button when `objectCount === 0`. |
| `noPublishObjectsTooltip` | `'No objects to publish'` | Tooltip shown on the Publish Objects button when `objectCount === 0`. |
| `cannotDeleteTooltip` | `'Cannot delete: objects are still attached'` | Tooltip shown on the Delete button when `objectCount > 0`. |
