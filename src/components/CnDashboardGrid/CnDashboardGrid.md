CnDashboardGrid is the low-level GridStack layout engine. Use `CnDashboardPage` for the full dashboard experience — CnDashboardGrid handles just the drag/drop/resize grid.

Static grid — fixed layout without editing:

```vue
<template>
  <div style="height: 400px; overflow: hidden; background: var(--color-background-hover); border-radius: 8px; padding: 16px;">
    <CnDashboardGrid
      :layout="layout"
      :allow-edit="false"
      @layout-change="layout = $event">
      <template #widget-kpis>
        <CnWidgetWrapper title="KPI metrics" :show-title="true" :borderless="true">
          <div style="display: flex; gap: 16px; padding: 8px;">
            <CnStatsBlock title="Open" :count="42" variant="primary" />
            <CnStatsBlock title="Closed" :count="128" variant="success" />
          </div>
        </CnWidgetWrapper>
      </template>
      <template #widget-notes>
        <CnWidgetWrapper title="Notes" :show-title="true" :borderless="true">
          <div style="padding: 8px; font-size: 14px; color: var(--color-text-maxcontrast);">
            No notes yet.
          </div>
        </CnWidgetWrapper>
      </template>
    </CnDashboardGrid>
  </div>
</template>
<script>
export default {
  data() {
    return {
      layout: [
        { id: 1, widgetId: 'kpis', gridX: 0, gridY: 0, gridWidth: 8, gridHeight: 2 },
        { id: 2, widgetId: 'notes', gridX: 8, gridY: 0, gridWidth: 4, gridHeight: 2 },
      ],
    }
  },
}
</script>
```

Editable grid with `editable`, `columns`, `cellHeight`, `margin`, `minWidth`, and `minHeight`:

```vue
<template>
  <div style="height: 420px; overflow: hidden; background: var(--color-background-hover); border-radius: 8px; padding: 16px;">
    <NcButton type="primary" style="margin-bottom: 12px;" @click="editing = !editing">
      {{ editing ? 'Done' : 'Edit layout' }}
    </NcButton>
    <CnDashboardGrid
      :layout="layout"
      :editable="editing"
      :columns="12"
      :cell-height="90"
      :margin="16"
      :min-width="3"
      :min-height="2"
      @layout-change="layout = $event">
      <template #widget="{ item }">
        <CnWidgetWrapper :title="item.widgetId" :show-title="true">
          <div style="padding: 12px; color: var(--color-text-maxcontrast); font-size: 13px;">
            Widget: {{ item.widgetId }}
          </div>
        </CnWidgetWrapper>
      </template>
    </CnDashboardGrid>
  </div>
</template>
<script>
export default {
  data() {
    return {
      editing: false,
      layout: [
        { id: 1, widgetId: 'alpha', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 2 },
        { id: 2, widgetId: 'beta',  gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 2 },
        { id: 3, widgetId: 'gamma', gridX: 0, gridY: 2, gridWidth: 4, gridHeight: 3 },
      ],
    }
  },
}
</script>
```

## Additional props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `editable` | Boolean | `false` | Enable drag and resize interactions |
| `columns` | Number | `12` | Number of grid columns |
| `cellHeight` | Number | `80` | Cell height in pixels |
| `margin` | Number | `12` | Gutter between grid items in pixels |
| `minWidth` | Number | `2` | Minimum widget width in grid units |
| `minHeight` | Number | `2` | Minimum widget height in grid units |
| `columnOpts` | Object | `null` | GridStack v12 responsive `columnOpts` bag; when set the grid reflows its column count across screen sizes. Build with `getDashboardColumnOpts()`. Default `null` = fixed `columns`. |
| `cellHeightCssVar` | String | `null` | When set, `cellHeight` is mirrored into this CSS custom property on the document root at init. Default `null` = none. |
| `itemKey` | Function | `null` | Optional `(item) => string\|number` to derive each item's render key; forces a re-render when an item changes in a way its `id` doesn't capture (e.g. style edits). Default `null` = key on `item.id`. |
| `keyboardRepositioning` | Boolean | `true` | Make grid items keyboard-operable: focusable in edit mode and repositionable with the arrow keys. |
| `itemLabel` | Function | `null` | Optional `(item, index) => string` returning a grid item's accessible name. Used verbatim. Default `null` = derive it from the item. |
| `activateOpensContextMenu` | Boolean | `true` | Whether `Enter`/`Space` on a focused item also dispatches a bubbling `contextmenu` event from inside it, so right-click widget menus work from the keyboard. |

## Keyboard operation and accessibility

GridStack's drag and resize gestures are pointer-only. CnDashboardGrid ships
the keyboard equivalent required by WCAG 2.1 SC 2.1.1, on by default:

- Every grid item is an ARIA `group` with an accessible name. In edit mode the
  name also carries the item's grid coordinates ("Revenue, column 5 of 12, row
  1, 4 columns wide, 2 rows tall") — without them a screen-reader user tabbing
  an edit-mode dashboard has no idea where anything sits.
- In edit mode (`editable` + `keyboardRepositioning`) each item is a tab stop
  with a visible focus ring and an `aria-describedby` pointer at a shared,
  visually-hidden key map.
- Move and resize results are spoken through a polite live region.

With a grid item focused:

| Key | Action |
| --- | ------ |
| `ArrowLeft` / `ArrowRight` | move one column left / right |
| `ArrowUp` / `ArrowDown` | move one row up / down |
| `Shift` + `ArrowLeft` / `ArrowRight` | shrink / grow width by one column |
| `Shift` + `ArrowUp` / `ArrowDown` | shrink / grow height by one row |
| `Home` / `End` | jump to the first / last column of the current row |
| `Enter` / `Space` | activate — emits `item-activate` and (by default) a synthetic `contextmenu` |

Keys are only honoured while the grid item element itself holds focus, so
buttons, inputs and menus rendered inside the `#widget` slot keep their own key
handling.

Every keyboard change is applied with `GridStack.update()` — the same engine
call drag and resize end in — so collision handling, the `layout-change`
payload and the consumer's persistence are identical for both input modes.
There is deliberately no second, keyboard-only update path.

### Wiring a widget menu to the keyboard

Consumers that open a per-widget menu on right-click get the keyboard path for
free: `Enter` dispatches a bubbling `contextmenu` from inside the item, anchored
to its top-left corner, exactly as browsers do for the `Menu` key. Prefer the
explicit event when you are writing new code:

```vue
<CnDashboardGrid
  :layout="placements"
  :editable="isEditing"
  :activate-opens-context-menu="false"
  @item-activate="({ item, clientX, clientY }) => openMenu(item, clientX, clientY)"
  @layout-change="onLayoutChange" />
```
