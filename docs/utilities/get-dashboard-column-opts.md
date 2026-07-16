# getDashboardColumnOpts

`getDashboardColumnOpts(breakpoints?, layout?)` — build the GridStack v12 `columnOpts` bag for responsive dashboard reflow. Pass the result to `CnDashboardGrid`'s `columnOpts` prop so the grid reflows its column count across screen sizes.

```js
import { getDashboardColumnOpts } from '@conduction/nextcloud-vue'

// default breakpoints: 1400→12, 1100→8, 768→4, 480→1 columns
const columnOpts = getDashboardColumnOpts()

// or a custom breakpoint table
const custom = getDashboardColumnOpts([{ w: 1200, c: 12 }, { w: 600, c: 1 }])
```

```vue
<CnDashboardGrid :layout="layout" :column-opts="columnOpts" :editable="editing" />
```

## Parameters

| Param | Type | Description |
|------|------|-------------|
| `breakpoints` | `Array<{ w: number, c: number }>` | Window-width → column-count table, descending. Defaults to `1400→12, 1100→8, 768→4, 480→1`. |
| `layout` | `string` | GridStack reflow algorithm; defaults to `'moveScale'`. |

## Returns

`{ breakpoints, layout, breakpointForWindow: true }` — a fresh `columnOpts` object safe to mutate.

See also [placeNewWidget](./place-new-widget.md) and the [CnDashboardGrid](../components/cn-dashboard-grid.md) component.
