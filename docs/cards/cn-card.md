---
sidebar_position: 1
---

# CnCard

Generic prop-driven card component for displaying entities with a title, icon, description, labels/badges, stats, and an optional active highlight state.

Unlike `CnObjectCard` (which derives display from a JSON Schema), `CnCard` takes explicit props — ideal for known, fixed-structure entities like sources, organisations, and applications.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `String` | `''` | Card title text |
| `description` | `String` | `''` | Description with line-clamp truncation |
| `titleTooltip` | `String` | `''` | Tooltip for the title (falls back to `description`) |
| `icon` | `Object\|Function` | `null` | MDI icon component |
| `iconSize` | `Number` | `20` | Icon size in pixels |
| `labels` | `Array` | `[]` | Badge objects: `[{ text, variant }]` rendered via CnStatusBadge |
| `stats` | `Array` | `[]` | Stat rows: `[{ label, value }]` displayed as label:value pairs |
| `descriptionLines` | `Number` | `3` | Max lines for description (CSS line-clamp) |
| `active` | `Boolean` | `false` | Active/highlighted state with colored border and background |
| `activeVariant` | `String` | `'success'` | Active color variant: `success`, `primary`, `warning`, `error`, `info` |
| `clickable` | `Boolean` | `false` | Adds hover effect and cursor pointer |

### Labels Format

Each label is an object with `text` and optional `variant`:

```js
[
  { text: 'Active', variant: 'success' },
  { text: 'Default', variant: 'warning' },
]
```

Variants match [CnStatusBadge](../components/cn-status-badge.md) variants: `default`, `primary`, `success`, `warning`, `error`, `info`.

### Stats Format

Each stat is an object with `label` and `value`:

```js
[
  { label: 'Type', value: 'PostgreSQL' },
  { label: 'Members', value: 12 },
  { label: 'Owner', value: 'Admin' },
]
```

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `click` | `Event` | Emitted when card is clicked (only when `clickable` is true) |

## Slots

| Slot | Description |
|------|-------------|
| `icon` | Replace the default icon rendering |
| `labels` | Replace the inline badge area |
| `description` | Replace the description block |
| `default` | Content between description and stats |
| `stats` | Replace the entire stats section |
| `actions` | NcActions menu area (top-right corner) |

## Usage

### Basic Card

```vue
<CnCard
  title="My Source"
  description="A PostgreSQL data source for importing records"
  :icon="DatabaseArrowRightOutline"
  :stats="[
    { label: 'Type', value: 'PostgreSQL' },
    { label: 'Database URL', value: 'postgres://localhost:5432/mydb' },
  ]">
  <template #actions>
    <NcActions :primary="true" menu-name="Actions">
      <template #icon>
        <DotsHorizontal :size="20" />
      </template>
      <NcActionButton @click="view(source)">View</NcActionButton>
      <NcActionButton @click="edit(source)">Edit</NcActionButton>
      <NcActionButton @click="remove(source)">Delete</NcActionButton>
    </NcActions>
  </template>
</CnCard>
```

### Card with Labels and Active State

```vue
<CnCard
  :title="organisation.name"
  :description="organisation.description"
  :icon="OfficeBuilding"
  :active="isActive"
  active-variant="success"
  :labels="[
    organisation.isDefault ? { text: 'Default', variant: 'warning' } : null,
    isActive ? { text: 'Active', variant: 'success' } : null,
  ].filter(Boolean)"
  :stats="[
    { label: 'Members', value: organisation.users?.length || 0 },
    { label: 'Owner', value: organisation.owner || 'System' },
  ]">
  <template #actions>
    <NcActions :primary="true" menu-name="Actions">
      <NcActionButton @click="view(organisation)">View</NcActionButton>
      <NcActionButton @click="setActive(organisation)">Set Active</NcActionButton>
      <NcActionButton @click="edit(organisation)">Edit</NcActionButton>
    </NcActions>
  </template>
</CnCard>
```

### Card with Status Badge

```vue
<CnCard
  :title="application.name"
  :description="application.description"
  :icon="ApplicationOutline"
  :labels="[
    {
      text: application.active ? 'Active' : 'Inactive',
      variant: application.active ? 'success' : 'default',
    },
  ]"
  :stats="[
    application.version ? { label: 'Version', value: application.version } : null,
    application.schemas ? { label: 'Schemas', value: application.schemas.length } : null,
    application.registers ? { label: 'Registers', value: application.registers.length } : null,
  ].filter(Boolean)">
  <template #actions>
    <NcActions :primary="true" menu-name="Actions">
      <NcActionButton @click="edit(application)">Edit</NcActionButton>
      <NcActionButton @click="remove(application)">Delete</NcActionButton>
    </NcActions>
  </template>
</CnCard>
```

### Clickable Card

```vue
<CnCard
  title="Dashboard Item"
  description="Click to view details"
  :icon="ViewDashboard"
  :clickable="true"
  @click="navigateToDetail(item)" />
```
