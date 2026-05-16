import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnDashboardGrid.md'

# CnDashboardGrid

Low-level drag-and-drop grid layout engine powered by [GridStack](https://gridstackjs.com/). Manages widget placement, drag, and resize interactions and emits layout changes for persistence. Does **not** handle widget rendering — the parent provides content via the `#widget` scoped slot.

Used internally by `CnDashboardPage`. Only use this directly if you need fine-grained control over the grid without the full dashboard page shell.

**Requires**: `gridstack` (bundled dependency)

## Try it

<Playground component="CnDashboardGrid" />

## Usage

```vue
<CnDashboardGrid
  :layout="placements"
  :editable="isEditing"
  :columns="12"
  :cell-height="80"
  @layout-change="onLayoutChange">
  <template #widget="{ item }">
    <MyWidget :config="item" />
  </template>
</CnDashboardGrid>
```

```js
// Layout item shape
const placements = [
  { id: 1, gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3 },
  { id: 2, gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 3 },
]

function onLayoutChange(updated) {
  // updated is the full layout array with new x/y/w/h values
  saveLayout(updated)
}
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `layout` | Array | ✓ | — | Array of layout items: `{ id, gridX, gridY, gridWidth, gridHeight, ...extra }` |
| `editable` | Boolean | | `false` | Enables drag and resize interactions |
| `columns` | Number | | `12` | Number of grid columns |
| `cellHeight` | Number | | `80` | Cell height in pixels |
| `margin` | Number | | `12` | Gap between grid items in pixels |
| `minWidth` | Number | | `2` | Minimum widget width in grid units |
| `minHeight` | Number | | `2` | Minimum widget height in grid units |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `layout-change` | `layout[]` | Emitted when any item is dragged or resized; payload is the full updated layout array |

### Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `widget` | `{ item }` | Content to render inside each grid cell; `item` is the layout object |

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnDashboardGrid.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnDashboardGrid/CnDashboardGrid.vue) and update automatically whenever the component changes.

<GeneratedRef />
