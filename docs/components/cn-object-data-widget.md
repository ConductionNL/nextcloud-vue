# CnObjectDataWidget

Schema-driven editable data grid widget. Displays object properties in a CSS grid, supports inline editing (click-to-edit with all widget types), dirty tracking, and saves via objectStore.

## Usage

```vue
<CnObjectDataWidget
  :object-data="currentObject"
  :schema="currentSchema"
  :store-id="'myStore'" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `String` | `'Data'` | Widget title in the card header |
| `icon` | `Object\|Function` | `null` | Optional MDI icon component |
| `object-data` | `Object` | *required* | The object to display and edit |
| `schema` | `Object` | `null` | JSON Schema defining properties |
| `store-id` | `String` | `null` | Pinia store ID for save operations |
| `editable` | `Boolean` | `true` | Whether inline editing is enabled |
| `columns` | `Number` | `2` | Number of grid columns |
| `overrides` | `Object` | `{}` | Per-property overrides (see below) |
| `save-label` | `String` | `'Save'` | Label for the save button |
| `discard-label` | `String` | `'Discard'` | Label for the discard button |
| `empty-label` | `String` | `'No data available'` | Label when no properties are found |

## Slots

| Slot | Scoped props | Description |
|------|-------------|-------------|
| `#header-actions` | — | Extra buttons in the widget header (right side, next to save/discard) |
| `#field-{key}` | `{ field, value, update, cancel }` | Override the editor for a specific property |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `@save` | `{ data }` | Emitted after a successful save |
| `@error` | `{ error }` | Emitted when save fails |

## Property overrides

The `overrides` prop accepts per-property configuration:

```js
{
  propertyKey: {
    order: 1,           // Sort order
    gridSpan: 2,        // Number of grid columns to span
    hidden: false,       // Whether to hide this property
    editable: true,      // Whether this property can be edited
    label: 'Custom',     // Override the label
    widget: 'textarea',  // Override the widget type
  }
}
```

## Supported widget types

The widget auto-detects the editor based on the JSON Schema property type:

| Widget | Schema type | Editor |
|--------|-------------|--------|
| `text` | `string` | Text input |
| `number` | `number`/`integer` | Number input |
| `textarea` | `string` (long) | Textarea |
| `select` | `string` with `enum` | Single select dropdown |
| `multiselect` | `array` with `enum` | Multi-select dropdown |
| `tags` | `array` (no enum) | Tag input |
| `checkbox` | `boolean` | Toggle switch |
| `date` | `string` format `date` | Date picker |
| `datetime` | `string` format `date-time` | Datetime picker |
| `email` | `string` format `email` | Email input |
| `url` | `string` format `uri` | URL input |

## Example with overrides

```vue
<CnObjectDataWidget
  title="Publication details"
  :object-data="publication"
  :schema="publicationSchema"
  :store-id="'publications'"
  :overrides="{
    title: { order: 1, gridSpan: 2 },
    description: { order: 2, gridSpan: 2, widget: 'textarea' },
    status: { order: 3, editable: false },
    internalNotes: { hidden: true },
  }" />
```
