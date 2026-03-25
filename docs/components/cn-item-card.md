---
sidebar_position: 12
---

# CnItemCard

Compact card for displaying an item in a sidebar list. Provides a header (icon + title + optional actions) and a flexible content area. Designed for use in sidebar lists such as schema listings, source listings, etc.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `''` | Card title |
| `subtitle` | String | `''` | Optional subtitle below the title |
| `icon` | Object \| Function | `null` | Icon component (e.g., imported MDI icon) |
| `iconSize` | Number | `20` | Icon size in pixels |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `click` | `event` | Card clicked |

## Slots

| Slot | Description |
|------|-------------|
| `#icon` | Custom icon content (replaces the `icon` prop) |
| `#actions` | Action buttons in the card header (right side) |
| `default` | Card body content below the header |

## Usage

### Basic

```vue
<CnItemCard title="My Schema" :icon="FileCodeOutline">
  <p>Schema content here</p>
</CnItemCard>
```

### With actions and stats

```vue
<CnItemCard title="My Schema" :icon="FileCodeOutline" subtitle="v1.0">
  <template #actions>
    <NcActions>
      <NcActionButton @click="edit">Edit</NcActionButton>
    </NcActions>
  </template>
  <CnKpiGrid :columns="2">
    <CnStatsBlock title="Objects" :count="42" />
    <CnStatsBlock title="Size" :count="0" :breakdown="{ size: '1.2 MB' }" />
  </CnKpiGrid>
</CnItemCard>
```
