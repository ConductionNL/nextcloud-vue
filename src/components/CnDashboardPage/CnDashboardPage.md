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

With `loading`, `cellHeight`, `gridMargin`, `emptyLabel`, `unavailableLabel`, `header-actions`, and `actions` slots:

```vue
<template>
  <div style="height: 500px; overflow: hidden; background: var(--color-main-background);">
    <CnDashboardPage
      title="Operations dashboard"
      :widgets="widgets"
      :layout="layout"
      :loading="isLoading"
      :allow-edit="true"
      :columns="12"
      :cell-height="100"
      :grid-margin="16"
      empty-label="No widgets have been added yet"
      unavailable-label="This widget is unavailable"
      @layout-change="layout = $event">
      <template #header-actions>
        <NcButton type="secondary" @click="resetLayout">Reset layout</NcButton>
      </template>
      <template #actions>
        <NcButton type="tertiary" @click="exportDashboard">Export</NcButton>
      </template>
      <template #widget-summary="{ item }">
        <div style="padding: 16px; font-size: 14px;">Summary widget content</div>
      </template>
    </CnDashboardPage>
  </div>
</template>
<script>
export default {
  data() {
    return {
      isLoading: false,
      widgets: [{ id: 'summary', title: 'Summary', type: 'custom' }],
      layout: [{ id: 1, widgetId: 'summary', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3 }],
    }
  },
  methods: {
    resetLayout() {},
    exportDashboard() {},
  },
}
</script>
```

## Additional props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `loading` | Boolean | `false` | Show a loading spinner instead of the widget grid |
| `cellHeight` | Number | `80` | Grid cell height in pixels (passed to CnDashboardGrid) |
| `gridMargin` | Number | `12` | Grid margin (gutter) in pixels between widgets |
| `emptyLabel` | String | `'No widgets configured'` | Text shown in the empty state when `layout` is empty |
| `unavailableLabel` | String | `'Widget not available'` | Text shown for unknown or unavailable widgets |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `header-actions` | — | Extra buttons shown in the page header (right side, before the edit toggle) |
| `actions` | — | Back-compat alias for `header-actions`; prefer `header-actions` in new code |
| `widget-{widgetId}` | `{ item, widget }` | Custom widget content for a widget with the given ID |
| `empty` | — | Custom empty state when no widgets are in the layout |
