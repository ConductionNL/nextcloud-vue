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
| `clickToView` | Boolean | `false` | Body click on a selectable card emits `click` (navigation); selection happens via the checkbox only (`CnIndexPage` wires this from its `rowClickToView`) |
| `selectedIds` | Array | `[]` | Currently selected IDs |
| `rowKey` | String | `'id'` | Unique identifier field |
| `emptyText` | String | `'No items found'` | |
| `accentOf` | Function | `null` | `(object) => { variant, icon?, label? } \| null`, each default card's `accent` (see [CnObjectCard](./cn-object-card.md)) |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `click` | `(object, event)` | Card clicked. The second argument is the native click event, for opening the card in a new tab on a ctrl/cmd/shift click. A middle click emits `aux-click` instead. |
| `aux-click` | `(object, event)` | Card middle-clicked, under the same conditions as `click`. The second argument is the native auxclick event, for opening the card in a new tab. |
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

## Board look

Under the board look the grid is `repeat(auto-fill, minmax(var(--cn-card-grid-min, 260px), 1fr))` with a `var(--cn-card-grid-gap, 16px)` gap, theme hooks for both; without it the 320px track stands. `cardFields`, `statusOf`, `leadingOf` and `footerActionOf` reach each default `CnObjectCard`.
