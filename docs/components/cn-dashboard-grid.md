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
| `columnOpts` | Object | | `null` | GridStack v12 responsive `columnOpts` bag; when set the grid reflows its column count across screen sizes. Build it with [getDashboardColumnOpts](../utilities/get-dashboard-column-opts.md). Default `null` = fixed `columns`. |
| `cellHeightCssVar` | String | | `null` | When set, `cellHeight` is mirrored into this CSS custom property on the document root at init (e.g. `--app-cell-height`). Default `null` = none. |
| `itemKey` | Function | | `null` | Optional `(item) => string\|number` to derive each item's render key; forces a re-render when an item changes in a way its `id` doesn't capture (e.g. style edits). Default `null` = key on `item.id`. |
| `keyboardRepositioning` | Boolean | | `true` | Makes grid items keyboard-operable: focusable in edit mode and repositionable/resizable with the arrow keys (WCAG 2.1 SC 2.1.1). See [Keyboard operation](#keyboard-operation-and-accessibility). |
| `itemLabel` | Function | | `null` | Optional `(item, index) => string` returning a grid item's accessible name; used verbatim. Default `null` = derived from the item (`title` → `name` → `label` → `widgetTitle` → `widgetId` → "Widget N"). |
| `activateOpensContextMenu` | Boolean | | `true` | Whether `Enter`/`Space` on a focused item also dispatches a bubbling `contextmenu` event from inside it, so right-click widget menus become keyboard-reachable without extra wiring. |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `layout-change` | `layout[]` | Emitted when any item is dragged, resized, or moved with the keyboard; payload is the full updated layout array |
| `item-activate` | `{ item, element, clientX, clientY }` | Emitted when the user presses `Enter` or `Space` on a focused grid item. The coordinates are anchored to the item's top-left corner so a consumer menu positions itself the same way it does for a right-click |

### Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `widget` | `{ item }` | Content to render inside each grid cell; `item` is the layout object |

## Keyboard operation and accessibility

GridStack's drag and resize gestures are pointer-only. CnDashboardGrid ships the
keyboard equivalent required by WCAG 2.1 SC 2.1.1, enabled by default:

- Every grid item is an ARIA `group` with an accessible name. In edit mode the
  name also carries the item's grid coordinates ("Revenue, column 5 of 12, row 1,
  4 columns wide, 2 rows tall") — without them a screen-reader user tabbing an
  edit-mode dashboard has no idea where anything sits.
- In edit mode (`editable` **and** `keyboardRepositioning`) each item is a tab
  stop with a visible focus ring, described by a shared, visually-hidden key map.
- Move and resize results are spoken through a polite live region.

With a grid item focused:

| Key | Action |
|-----|--------|
| `ArrowLeft` / `ArrowRight` | Move one column left / right |
| `ArrowUp` / `ArrowDown` | Move one row up / down |
| `Shift` + `ArrowLeft` / `ArrowRight` | Shrink / grow width by one column |
| `Shift` + `ArrowUp` / `ArrowDown` | Shrink / grow height by one row |
| `Home` / `End` | Jump to the first / last column of the current row |
| `Enter` / `Space` | Activate — emits `item-activate` and (by default) a synthetic `contextmenu` |

Keys are only honoured while the grid item element itself holds focus, so
buttons, inputs and menus rendered inside the `#widget` slot keep their own key
handling.

Every keyboard change is applied with `GridStack.update()` — the same engine call
drag and resize end in — so collision handling, the `layout-change` payload and
the consumer's persistence are identical for both input modes. There is
deliberately no second, keyboard-only update path.

### Wiring a widget menu to the keyboard

Consumers that open a per-widget menu on right-click get the keyboard path for
free: `Enter` dispatches a bubbling `contextmenu` from inside the item, anchored
to its top-left corner, exactly as browsers do for the `Menu` key. Prefer the
explicit event in new code:

```vue
<CnDashboardGrid
  :layout="placements"
  :editable="isEditing"
  :activate-opens-context-menu="false"
  @item-activate="({ item, clientX, clientY }) => openMenu(item, clientX, clientY)"
  @layout-change="onLayoutChange" />
```

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnDashboardGrid.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnDashboardGrid/CnDashboardGrid.vue) and update automatically whenever the component changes.

<GeneratedRef />
