---
sidebar_position: 36
---

# CnFormBuilder

Visual form composer. Three columns: a field-type palette (click to append), a reorderable field list, and a per-field config panel. Emits the live `fields[]` array via `v-model` so consumers can save / preview / render via [`CnFormDialog`](./cn-form-dialog.md).

MVP. Drag-drop reorder is a follow-up — for now the field list uses up/down buttons. The v-model contract is forward-compatible so adding drag-drop later won't touch consumers.

## Try it

```vue
<template>
  <div>
    <CnFormBuilder v-model="fields" @save="onSave" />
    <hr>
    <CnFormDialog
      v-if="preview"
      :schema="{ properties: schemaProperties(fields) }"
      :item="null"
      @close="preview = false" />
  </div>
</template>

<script>
import { CnFormBuilder, CnFormDialog } from '@conduction/nextcloud-vue'

export default {
  components: { CnFormBuilder, CnFormDialog },
  data() { return { fields: [], preview: false } },
  methods: {
    schemaProperties(fields) {
      // Translate to the CnFormDialog `properties` shape.
      const out = {}
      for (const f of fields) {
        out[f.key] = { title: f.label, type: f.type === 'number' ? 'number' : 'string', ...(f.options ? { enum: f.options } : {}) }
      }
      return out
    },
    async onSave(fields) {
      await axios.post('/api/forms', { fields })
    },
  },
}
</script>
```

## Field shape

```ts
{
  key: string,
  type: 'string' | 'number' | 'boolean' | 'enum' | 'textarea',
  label?: string,
  placeholder?: string,
  required?: boolean,
  options?: string[],   // only for type='enum'
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Array<Field>` | `[]` | v-model. Current field list. |
| `availableTypes` | `Array<{type,label,icon?}>` | default 5 | Extend / replace the palette. |
| `title` / `description` | String | `''` | Optional header. |
| `hidePreview` | Boolean | `false` | Hide the JSON preview footer. |
| `paletteTitle` / `fieldsTitle` / `editorTitle` / `previewTitle` | String | — | Column headers. |
| `emptyLabel` / `noSelectionLabel` / `untitledKey` | String | — | State texts. |
| `keyLabel` / `typeLabel` / `labelLabel` / `placeholderLabel` / `requiredLabel` / `optionsLabel` / `optionsPlaceholder` | String | — | Per-field editor labels. |
| `moveUpLabel` / `moveDownLabel` / `deleteLabel` | String | — | Row-action button titles. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `input` | `Array<Field>` | v-model emit on every mutation. |
| `save` | `Array<Field>` | Triggered by the public `save()` method. The parent renders the actual save UI. |

## Public methods

| Method | Description |
|--------|-------------|
| `save()` | Emit a `@save` with a copy of the current model. |

## Follow-up

- Drag-drop reorder (HTML5 dragstart/dragover/drop on field rows).
- Per-field validation rule editor (regex, min/max).
- Live preview via embedded `CnFormDialog`.
- Conditional visibility rules (`showIf`).
