---
sidebar_position: 8
---

# CnCardGrid

Responsive CSS grid layout for CnObjectCard instances. Auto-fills with `minmax(320px, 1fr)`.

**Wraps**: NcLoadingIcon, NcEmptyContent, CnObjectCard

![CnCardGrid showing a grid of object cards](/img/screenshots/cn-card-grid.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `objects` | Array | `[]` | Object data array |
| `schema` | Object | *(required)* | Passed to each CnObjectCard |
| `loading` | Boolean | `false` | Loading state |
| `selectable` | Boolean | `false` | Enable card selection |
| `selectedIds` | Array | `[]` | Currently selected IDs |
| `rowKey` | String | `'id'` | Unique identifier field |
| `emptyText` | String | `'No items found'` | |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `click` | `object` | Card clicked |
| `select` | `ids[]` | Selection changed |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `#card` | `\{ object, selected, schema \}` | Custom card template |
| `#card-actions` | `\{ object \}` | Card action buttons |
| `#card-badges` | `\{ object \}` | Card badges |
| `#empty` | — | Custom empty state |

## Usage

```vue
<CnCardGrid
  :objects="contacts"
  :schema="schema"
  :selectable="true"
  :selected-ids="selected"
  @click="onCardClick"
  @select="onSelect" />
```
