# CnObjectDataWidget

Schema-driven editable data grid widget. Displays object properties in a CSS grid, supports inline editing (click-to-edit with all widget types), dirty tracking, and saves via objectStore.

## Usage

```vue
<CnObjectDataWidget
  title="Character info"
  :schema="schema"
  :object-data="character"
  object-type="characters" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `String` | `'Data'` | Widget title in the card header |
| `icon` | `Object\|Function` | `null` | Optional MDI icon component for the header |
| `object-data` | `Object` | *required* | The object to display and edit. Keys must match the schema property keys. |
| `schema` | `Object` | *required* | JSON Schema defining properties. Must have a `properties` field. |
| `object-type` | `String` | `''` | Registered object type slug in the objectStore. Required for saving via `objectStore.saveObject()`. |
| `store` | `Object` | `null` | Optional objectStore instance. When provided, used directly for saving instead of auto-detecting via Pinia. |
| `overrides` | `Object` | `{}` | Per-property configuration overrides (see below) |
| `columns` | `Number` | `3` | Number of grid columns |
| `editable` | `Boolean` | `true` | Whether inline editing is enabled globally |
| `exclude` | `Array` | `[]` | Property keys to hide from display |
| `include` | `Array` | `null` | Property keys to show (whitelist — all others hidden) |
| `save-label` | `String` | `'Save'` | Label for the save button |
| `discard-label` | `String` | `'Discard'` | Label for the discard button |
| `empty-label` | `String` | `'No data available'` | Label when no properties are found |

## Slots

| Slot | Scoped props | Description |
|------|-------------|-------------|
| `#actions` | — | Extra buttons in the widget header (right side, next to save/discard) |
| `#field-{key}` | `{ field, value, update, cancel }` | Override the inline editor for a specific property |
| `#display-{key}` | `{ field, value, raw }` | Override the display (read-only) view for a specific property |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `@saved` | result object | Emitted after a successful objectStore save |
| `@save-error` | error message | Emitted when the objectStore save fails |
| `@save` | merged data object | Emitted when no `objectType` is set — lets the parent handle the save |
| `@discard` | — | Emitted when the user clicks the discard button |

## Property overrides

The `overrides` prop accepts per-property configuration:

```js
{
  propertyKey: {
    order: 1,          // Sort order (lower = first)
    gridColumn: 2,     // Number of grid columns to span
    gridRow: 2,        // Number of grid rows to span
    hidden: false,     // Whether to hide this property
    editable: true,    // Whether this property can be edited
    label: 'Custom',   // Override the display label
    widget: 'textarea', // Override the widget type for editing
    enum: [...],       // Override enum values for select/multiselect
  }
}
```

## Supported widget types

The widget auto-detects the editor based on the JSON Schema property type:

| Widget | Schema type | Editor |
|--------|-------------|--------|
| `text` | `string` | Text input |
| `email` | `string` format `email` | Email input |
| `url` | `string` format `uri` | URL input |
| `number` | `number`/`integer` | Number input |
| `textarea` | `string` (long) | Textarea |
| `select` | `string` with `enum` | Single select dropdown |
| `multiselect` | `array` with `enum` | Multi-select dropdown |
| `tags` | `array` (no enum) | Tag input |
| `checkbox` | `boolean` | Toggle switch |
| `date` | `string` format `date` | Date picker |
| `datetime` | `string` format `date-time` | Datetime picker |

## Example with overrides

```vue
<CnObjectDataWidget
  title="Publication details"
  :schema="publicationSchema"
  :object-data="publication"
  object-type="publications"
  :overrides="{
    title: { order: 1, gridColumn: 2 },
    description: { order: 2, gridColumn: 2, widget: 'textarea' },
    status: { order: 3, editable: false },
    internalNotes: { hidden: true },
  }" />
```
