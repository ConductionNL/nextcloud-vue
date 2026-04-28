---
sidebar_position: 20
---

# CnPropertiesTab

Schema-driven properties table with click-to-edit cells, validation indicators, and per-row action slots. Used internally by [`CnAdvancedFormDialog`](cn-advanced-form-dialog.md), and exposed as a top-level component for consumers that want the same editing UX inside their own dialog/page chrome (e.g. when the surrounding shell, footer, or extra tabs don't fit `CnAdvancedFormDialog`'s assumptions).

**Wraps**: `CnPropertyValueCell` (internal), `vue-material-design-icons` (Alert / AlertCircle / Plus / LockOutline)

---

## When to use

- You already have your own dialog or page layout, but want the schema-driven property table with validation indicators, lock icon, and click-to-edit behaviour.
- You need an extra "actions" column per row (e.g. a "drop / reset property" button).
- You need to override how individual cells render — e.g. plug in a markdown editor or a domain-specific multiselect.

If the standard create/edit dialog with Properties / Metadata / Data tabs is enough, prefer [`CnAdvancedFormDialog`](cn-advanced-form-dialog.md).

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `schema` | Object | `null` | JSON Schema. Property list is derived from `schema.properties`; `schema.required` drives validation. |
| `item` | Object | `null` | The current object whose values are displayed/edited. |
| `formData` | Object | `{}` | Edits-in-progress overlay. When `formData[key] !== undefined` it overrides `item[key]` and the row gets the "edited" highlight. `formData[key] === undefined` is treated as "marked for deletion" by the value cell. |
| `selectedProperty` | String | `null` | The currently selected (edit-mode) property key. Bind via `update:selected-property` for two-way control. |
| `editableTypes` | Array | `['string','number','integer','boolean','array','object']` | Schema types that render an editor when their row is selected. Pass a narrower list to restrict (e.g. `['string','number','integer','boolean']` to keep arrays and objects read-only). |
| `validationDisplay` | String | `'indicator'` | `'indicator'` shows error/warning/new icons + row tinting; `'none'` hides them. |
| `excludeFields` | Array | `[]` | Property keys to hide. `id` and `@self` are always hidden. |
| `includeFields` | Array | `null` | If set, only these keys are shown (whitelist). |
| `showConstantProperties` | Boolean | `true` | When `false`, properties whose schema entry has `const` set or `immutable: true` are filtered out. Use together with `hasConstantOrImmutableProperties` (see below) to drive a show/hide toggle in the parent. |
| `propertyOverrides` | Object | `{}` | Per-property cell-config overlay, keyed by property key. Each entry may contain: `widget` (`'text' \| 'number' \| 'boolean' \| 'datetime' \| 'textarea' \| 'array' \| 'select'`), `selectOptions`, `selectMultiple`, `textareaRows`. |

### `propertyOverrides` example

```js
{
  themes: {
    widget: 'select',
    selectOptions: [{ id: 1, label: 'Internal' }, { id: 2, label: 'Public' }],
    selectMultiple: true,
  },
  description: { widget: 'textarea', textareaRows: 6 },
}
```

`textarea` and `array` widgets are also auto-detected from the schema (`format: 'text'` and `type: 'array'` respectively) — overrides only need to be supplied for cases the schema can't express, like a `select` whose options come from a runtime collection.

---

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:selected-property` | `key` | Emitted when a row is clicked and selection changes. |
| `update:property-value` | `{ key, value }` | Emitted when a cell editor commits a new value. The parent should patch `formData[key] = value` (or otherwise persist the edit) — this component does not mutate `formData` itself. |

---

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `row-actions` | `{ propertyKey, value, resolvedValue, isEditable, isSchemaProperty }` | When provided, an extra column is appended to every row and rendered with this slot. Use it for inline action buttons (drop, reset, copy, …). When the slot is absent, no extra column is added. |
| `row-actions-header` | — | Optional header content for the actions column. Only relevant when `row-actions` is provided. |
| `value-cell` | `{ propertyKey, value, resolvedValue, isEditing, isEditable, displayName, schemaProp, editabilityWarning, onUpdate }` | Replaces the built-in `CnPropertyValueCell` renderer entirely. Use this for cells that need a renderer the library doesn't ship — e.g. a Toast UI markdown editor. Call `onUpdate(newValue)` to commit. |

---

## Public properties

These are accessible via `$refs` and are useful for parents that want to drive UI based on the table state.

| Name | Type | Description |
|------|------|-------------|
| `hasConstantOrImmutableProperties` | computed (boolean) | `true` when at least one property in the (unfiltered) list is `const` or `immutable`. Use it to render a "show/hide constant properties" toggle button only when relevant. |

---

## Usage

### Basic (read-only, no actions)

```vue
<CnPropertiesTab
  :schema="schema"
  :item="item"
  :form-data="formData"
  :selected-property="selectedProperty"
  @update:selected-property="selectedProperty = $event"
  @update:property-value="onPropertyValueUpdate" />
```

### With a "drop property" action column

```vue
<CnPropertiesTab
  :schema="schema"
  :item="item"
  :form-data="formData"
  :selected-property="selectedProperty"
  @update:selected-property="selectedProperty = $event"
  @update:property-value="onPropertyValueUpdate">
  <template #row-actions="{ propertyKey, resolvedValue, isSchemaProperty }">
    <NcButton v-if="canDropProperty(propertyKey, resolvedValue)"
              type="tertiary-no-background"
              size="small"
              @click.stop="dropProperty(propertyKey)">
      <template #icon><Close :size="16" /></template>
    </NcButton>
  </template>
</CnPropertiesTab>
```

### With a custom value-cell (markdown editor)

```vue
<CnPropertiesTab
  ref="propertiesTab"
  :schema="schema"
  :item="item"
  :form-data="formData"
  :selected-property="selectedProperty"
  @update:selected-property="selectedProperty = $event"
  @update:property-value="onPropertyValueUpdate">
  <template #value-cell="{ propertyKey, resolvedValue, isEditing, isEditable, displayName, schemaProp, onUpdate }">
    <MyMarkdownEditor
      v-if="schemaProp && schemaProp.format === 'markdown' && isEditing"
      :value="String(resolvedValue || '')"
      @update:value="onUpdate" />
    <!-- Otherwise let the default cell render -->
    <CnPropertyValueCellDefault
      v-else
      :property-key="propertyKey"
      :schema="schema"
      :value="resolvedValue"
      :is-editable="isEditable"
      :is-editing="isEditing"
      :display-name="displayName"
      @update:value="onUpdate" />
  </template>
</CnPropertiesTab>
```

> The slot is "all or nothing" per row: when provided, the slot is responsible for both display and editing. The library does not ship a default fallback inside the slot — render your own per-property logic and only short-circuit for the keys that need it.

### Show/hide constant properties toggle

```vue
<NcButton
  v-if="$refs.propertiesTab && $refs.propertiesTab.hasConstantOrImmutableProperties"
  @click="showConstantProperties = !showConstantProperties">
  {{ showConstantProperties ? 'Hide constants' : 'Show constants' }}
</NcButton>

<CnPropertiesTab
  ref="propertiesTab"
  :schema="schema"
  :item="item"
  :form-data="formData"
  :show-constant-properties="showConstantProperties"
  ... />
```
