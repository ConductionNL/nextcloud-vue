---
sidebar_position: 8
---

import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnCardGrid.md'

# CnCardGrid

Responsive CSS grid layout for CnObjectCard instances. Auto-fills with `minmax(320px, 1fr)`.

**Wraps**: NcLoadingIcon, NcEmptyContent, CnObjectCard

## Try it

<Playground component="CnCardGrid" />

![CnCardGrid showing a grid of object cards](/img/screenshots/cn-card-grid.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `objects` | Array | `[]` | Object data array |
| `schema` | Object | `null` | Passed to each CnObjectCard (required only when using the default card template; not needed when providing a custom `#card` slot) |
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

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnCardGrid.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnCardGrid/CnCardGrid.vue) and update automatically whenever the component changes.

<GeneratedRef />
