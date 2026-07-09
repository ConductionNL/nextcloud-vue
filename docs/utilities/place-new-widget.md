# placeNewWidget

`placeNewWidget(spec, layout, options?)` — compute where a newly-added widget should go on a dashboard grid, plus any push-down side effects on existing items. Pure and framework-agnostic; the single placement authority shared by `CnDashboardGrid` consumers.

```js
import { placeNewWidget } from '@conduction/nextcloud-vue'

const { x, y, w, h, pushed } = placeNewWidget(
  { w: 4, h: 4 },          // target size (defaults: w=4, h=4)
  layout,                  // current items: { id, gridX, gridY, gridWidth, gridHeight }
  { columns: 12, viewportRows: 8 /* , grid: liveGridStackInstance */ },
)
// place the new widget at (x, y, w, h); shift each pushed item: { id, gridY }
```

## Algorithm

1. **Primary** — find the first empty slot via the live GridStack engine (`options.grid`) when supplied, otherwise an engine-free top-left → bottom-right scan.
2. **Fallback** — when no slot is found, or the slot is below `viewportRows` (off-screen on first paint), place the widget at `(0, 0)` and return the existing items that overlap it in `pushed` (each `{ id, gridY }`) so the caller can shift them down.

## Parameters

| Param | Type | Description |
|------|------|-------------|
| `spec` | `object` | Target widget spec. `spec.w` / `spec.h` default to 4 / 4. |
| `layout` | `Array<object>` | Current layout items in `gridX`/`gridY`/`gridWidth`/`gridHeight`/`id` form (the `CnDashboardGrid` `layout` shape). |
| `options.columns` | `number` | Column count (default 12). |
| `options.viewportRows` | `number` | Visible rows on first paint (default 8); slots below this trigger the push-down fallback. |
| `options.grid` | `object` | Live GridStack instance — when supplied its engine computes the empty position directly. |

## Returns

`{ x, y, w, h, pushed }` — the chosen position and the list of existing items (`{ id, gridY }`) that must shift down.

See also [getDashboardColumnOpts](./get-dashboard-column-opts.md) and the [CnDashboardGrid](../components/cn-dashboard-grid.md) component.
