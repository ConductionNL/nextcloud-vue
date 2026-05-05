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
