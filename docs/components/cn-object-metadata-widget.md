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
| `object-data` | `Object` | `null` | The object containing metadata (flat or with `@self` block). Optional — `null` renders the empty state (e.g. before the object loads). |
| `layout` | `String` | `'horizontal'` | Grid layout mode: `'grid'` or `'horizontal'` |
| `columns` | `Number` | `0` | Number of grid columns (layout='grid' only) |
| `label-width` | `Number` | `150` | Min width for labels in horizontal layout |
| `extra-items` | `Array` | `[]` | Additional `{ label, value }` items to display |
| `include` | `Array\|null` | `null` | Whitelist of metadata field keys to show |
| `exclude` | `Array` | `[]` | Metadata field keys to hide |
| `grouped` | `Boolean` | `true` | Sort the fields into categories, each under its own heading. `false` renders one flat grid. |
| `other-label` | `String` | `'Other'` | Heading for `extra-items`, which carry no category of their own |
| `collapsible` | `Boolean` | `false` | Whether the card can be collapsed |
| `collapsed` | `Boolean` | `false` | Initial collapsed state |
| `empty-label` | `String` | `'No metadata available'` | Label when no metadata is found |

## Slots

| Slot | Description |
|------|-------------|
| `#header-actions` | Buttons in the widget header (right side of the title) |

## Known metadata fields

The widget recognises these fields from the object or its `@self` block, and
sorts them into five categories. A category with nothing in it is dropped
rather than shown as an empty heading.

| Category | Fields |
|------|------|
| Identity | `id`, `uuid`, `uri`, `version`, `textRepresentation` |
| Location | `register`, `schema`, `schemaVersion`, `folder` |
| Ownership | `owner`, `organisation`, `organization` |
| Lifecycle | `status`, `created`, `updated`, `locked` |
| Archiving | read from `@self._retention`, see below |

`folder` renders as a link into Files when it holds a numeric node id. A folder
stored as a path is shown as plain text, because a deep-link built from a path
would go nowhere.

### The archiving category

These come from `@self._retention`, the abstract archival answer OpenRegister
resolves for every object. They use MDTO concepts under English names.

| Field | Shows |
|------|------|
| `appraisal` | What happens to the record: keep permanently, destroy, or not yet determined |
| `retentionPeriod` | How long it is kept, read from an ISO-8601 duration |
| `disposalDate` | The date the appraisal takes effect |
| `recordState` | Where the record sits in the Archiefwet lifecycle |
| `disposalCategory` | The selection list category the decision came from |
| `basis` | On whose authority the period rests |
| `source` | The named selection list or schema behind it |
| `legalHold` | An active hold, with its reason |

The widget shows nothing archival for an object that carries no obligation.

## Examples

### Selective display

```vue
<CnObjectMetadataWidget
  :object-data="entity"
  :include="['id', 'uuid', 'created', 'updated', 'owner']" />
```

### One flat list instead of categories

```vue
<CnObjectMetadataWidget :object-data="entity" :grouped="false" />
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
