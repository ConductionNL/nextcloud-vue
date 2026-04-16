# CnObjectMetadataWidget

Read-only metadata display widget. Automatically extracts and formats system metadata from an OpenRegister object (`@self` block: id, uuid, uri, register, schema, created, updated, owner, etc.).

## Usage

```vue
<CnObjectMetadataWidget :object-data="currentObject" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `String` | `'Metadata'` | Widget title in the card header |
| `icon` | `Object\|Function` | `null` | Optional MDI icon component |
| `object-data` | `Object` | *required* | The object containing metadata (flat or with `@self` block) |
| `layout` | `String` | `'horizontal'` | Grid layout mode: `'grid'` or `'horizontal'` |
| `columns` | `Number` | `0` | Number of grid columns (layout='grid' only) |
| `label-width` | `Number` | `150` | Min width for labels in horizontal layout |
| `extra-items` | `Array` | `[]` | Additional `{ label, value }` items to display |
| `include` | `Array\|null` | `null` | Whitelist of metadata field keys to show |
| `exclude` | `Array` | `[]` | Metadata field keys to hide |
| `collapsible` | `Boolean` | `false` | Whether the card can be collapsed |
| `collapsed` | `Boolean` | `false` | Initial collapsed state |
| `empty-label` | `String` | `'No metadata available'` | Label when no metadata is found |

## Slots

| Slot | Description |
|------|-------------|
| `#header-actions` | Buttons in the widget header (right side of the title) |

## Known metadata fields

The widget recognizes these fields from the object or its `@self` block:

`id`, `uuid`, `uri`, `register`, `schema`, `status`, `owner`, `organization`, `created`, `updated`, `folder`, `textRepresentation`, `locked`, `version`

## Examples

### Selective display

```vue
<CnObjectMetadataWidget
  :object-data="entity"
  :include="['id', 'uuid', 'created', 'updated', 'owner']" />
```

### With extra items

```vue
<CnObjectMetadataWidget
  title="System info"
  :object-data="entity"
  :extra-items="[
    { label: 'Source', value: entity.source },
    { label: 'Catalog', value: entity.catalog },
  ]" />
```
