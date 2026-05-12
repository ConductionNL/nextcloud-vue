---
sidebar_position: 4
---

# CnDetailGrid

Data-driven label-value grid for detail and information sections. Replaces the common pattern of manually writing `<div class="detail-item"><label>...</label><span>...</span></div>` with repeated CSS.

Supports two layout modes:
- **Grid** (default) — Responsive card grid with label stacked above value, left accent border
- **Horizontal** — Vertical list of rows with label on the left and value on the right

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `Array<{ label, value? }>` | `[]` | Array of items to render. Each item needs a `label` (string) and optional `value` (string or number). Items without a `value` display `'-'` unless overridden by a slot. |
| `layout` | `'grid'` \| `'horizontal'` | `'grid'` | Layout mode. `'grid'` renders a responsive card grid. `'horizontal'` renders label-value rows. |
| `columns` | Number | `0` | Fixed number of grid columns. Only applies to `layout="grid"`. Set to `0` (default) for responsive auto-fit behavior. |
| `minItemWidth` | Number | `250` | Minimum width (px) for auto-fit grid items. Only applies when `columns` is `0` and `layout` is `'grid'`. |
| `labelWidth` | Number | `150` | Minimum width (px) for labels in horizontal mode. |
| `accent` | Boolean | `true` | Show a left accent border (primary color) on each item. |
| `emptyLabel` | String | `'No details available'` | Text shown when the `items` array is empty and no default slot is provided. |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `#item-{index}` | `{ item, index }` | Override the **value** portion of a specific item. Useful for rendering components (badges, selects, etc.) instead of plain text. |
| `#label-{index}` | `{ item, index }` | Override the **label** portion of a specific item. |
| `#item-actions-{index}` | `{ item, index }` | Add action buttons alongside a specific item (e.g. an edit button). |
| `#empty` | — | Custom empty state content. |
| `#default` | — | Append extra content after the data-driven items. |

## Usage

### Simple data-driven grid

The most common use case — pass an array of label-value pairs:

```vue
<CnDetailGrid :items="[
  { label: 'ID', value: item.id },
  { label: 'Name', value: item.name },
  { label: 'Created', value: new Date(item.created).toLocaleString() },
  { label: 'Status', value: item.status || '-' },
]" />
```

### Grid with a custom value (slot override)

Use `#item-{index}` to render a component instead of plain text for a specific item. The item at that index doesn't need a `value` — the slot replaces it entirely.

```vue
<CnDetailGrid :items="[
  { label: 'ID', value: item.id },
  { label: 'Status' },
  { label: 'Created', value: formatDate(item.created) },
]">
  <!-- Override the value of item at index 1 ("Status") -->
  <template #item-1>
    <CnStatusBadge :label="item.status" :color-map="statusColors" solid />
  </template>
</CnDetailGrid>
```

### Horizontal row layout

For compact key-value lists (e.g. additional metadata, settings summaries):

```vue
<CnDetailGrid
  layout="horizontal"
  :items="[
    { label: 'Database', value: 'PostgreSQL 15' },
    { label: 'Host', value: 'db.example.com' },
    { label: 'Port', value: '5432' },
  ]" />
```

### Fixed column count

Force a specific number of columns instead of responsive auto-fit:

```vue
<CnDetailGrid :columns="3" :items="items" />
```

### Without accent border

Disable the left primary-color border:

```vue
<CnDetailGrid :accent="false" :items="items" />
```

### Per-item action buttons

Add an edit or delete button next to a specific item:

```vue
<CnDetailGrid :items="[
  { label: 'Catalogus', value: selectedCatalogus?.label },
  { label: 'Register', value: selectedRegister?.label },
]">
  <template #item-actions-0>
    <NcButton @click="editCatalogus">
      <template #icon><Pencil :size="20" /></template>
    </NcButton>
  </template>
</CnDetailGrid>
```

### Dynamic items from object entries

Build items from an object at runtime:

```vue
<CnDetailGrid
  layout="horizontal"
  :items="Object.entries(metadata).map(([key, val]) => ({
    label: key,
    value: String(val),
  }))" />
```

## Styling

The component uses Nextcloud CSS variables for theming:
- `--color-background-hover` — item background
- `--color-primary-element` — accent border color
- `--color-text-maxcontrast` — label text color
- `--color-main-text` — value text color

On screens narrower than 600px, the grid collapses to a single column and horizontal items stack vertically.

## Integration props (AD-18)

| Prop | Type | Default | Notes |
|---|---|---|---|
| `referenceContext` (`reference-context`) | Object \| null | `null` | Object context `{ register, schema, objectId }` forwarded to the integration single-entity widget rendered for items that declare a `referenceType`. Optional. |
