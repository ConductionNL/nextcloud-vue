Full dashboard page with custom widgets — each widget gets a scoped slot:

```vue
<template>
  <div style="height: 500px; overflow: hidden; background: var(--color-main-background);">
    <CnDashboardPage
      title="My dashboard"
      description="Overview of key metrics"
      :widgets="widgets"
      :layout="layout"
      :allow-edit="editing"
      edit-label="Edit layout"
      done-label="Done"
      @layout-change="layout = $event"
      @edit-toggle="editing = $event">
      <template #widget-kpis>
        <CnKpiGrid :columns="4" style="margin: 0;">
          <CnStatsBlock title="Objects" :count="4821" variant="primary" />
          <CnStatsBlock title="Schemas" :count="12" variant="success" />
          <CnStatsBlock title="Registers" :count="3" variant="info" />
          <CnStatsBlock title="Users" :count="28" variant="default" />
        </CnKpiGrid>
      </template>
      <template #widget-activity>
        <div style="padding: 8px; font-size: 14px; color: var(--color-text-maxcontrast);">
          <div style="padding: 6px 0; border-bottom: 1px solid var(--color-border);">Object #4821 created</div>
          <div style="padding: 6px 0; border-bottom: 1px solid var(--color-border);">Schema "contact" updated</div>
          <div style="padding: 6px 0;">User "alice" joined</div>
        </div>
      </template>
    </CnDashboardPage>
  </div>
</template>
<script>
export default {
  data() {
    return {
      editing: false,
      widgets: [
        { id: 'kpis', title: 'Key metrics', type: 'custom' },
        { id: 'activity', title: 'Recent activity', type: 'custom' },
      ],
      layout: [
        { id: 1, widgetId: 'kpis', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2, showTitle: false },
        { id: 2, widgetId: 'activity', gridX: 0, gridY: 2, gridWidth: 6, gridHeight: 3 },
      ],
    }
  },
}
</script>
```
