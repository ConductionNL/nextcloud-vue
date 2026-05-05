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
