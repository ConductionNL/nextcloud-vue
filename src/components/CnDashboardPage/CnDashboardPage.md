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
          <CnStatsBlock title="Registers" :count="3" variant="warning" />
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

## Conditional widgets collapse their cell

Any widget def may carry a top-level `visibleWhen` (the shared predicate
shape); while it is unmet the page removes the widget from the grid layout
in live mode and compacts the remaining widgets upward, so a conditional
card — a pending-work queue, a warning banner — leaves no empty card and no
reserved row behind while it has nothing to say. Banners keep their extra
rule (no text = never renders = collapsed) and may declare the predicate in
`content`/`props` as before. This is display-only: the authored `layout` is
never mutated, and edit mode shows every widget at its authored spot so a
hidden widget stays placeable and configurable.

The grid's first paint waits for the predicates to settle (a dashboard with
no conditional widgets never waits), so a conditional widget is present or
absent from the first rendered frame instead of popping in after load and
reflowing the page. The page evaluates each predicate once per mount
(re-evaluated when the widget defs change) and hands the verdict to banners,
which render from it without issuing a second request — and interpolate the
predicate's field value into their text wherever it says `{value}` (e.g.
`"{value} application(s) awaiting approval"`).

## Additional props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `loading` | Boolean | `false` | Show a loading spinner instead of the widget grid |
| `cellHeight` | Number | `80` | Grid cell height in pixels (passed to CnDashboardGrid) |
| `gridMargin` | Number | `12` | Grid margin (gutter) in pixels between widgets |
| `emptyLabel` | String | `'No widgets configured'` | Text shown in the empty state when `layout` is empty |
| `unavailableLabel` | String | `'Widget not available'` | Text shown for unknown or unavailable widgets |
| `userLayout` | Boolean | `false` | Keep a per-user arrangement of this page. Off by default: a page without it makes **no** layout request and renders exactly as before. |
| `appId` | String | `''` | The Nextcloud app the user layout is stored under. Required for `userLayout` to do anything. |
| `userLayoutStore` | Object | `null` | A store exposing `loadDashboardLayout` / `saveDashboardLayout` / `resetDashboardLayout`, usually one carrying [`dashboardLayoutsPlugin`](../../../docs/store/plugins/dashboard-layouts.md). Left unset, the page reads and writes user preferences directly. |

## Per-user layout

With `userLayout: true` and an `appId`, this page loads the current user's arrangement before the first grid render and merges it over the manifest layout. The rules are [`mergeUserLayout`](../../../docs/utilities/merge-user-layout.md)'s: **the manifest decides which widgets exist, the user decides where they sit.**

```vue
<CnDashboardPage
  :widgets="widgets"
  :layout="manifestLayout"
  page-id="Dashboard"
  app-id="dossiq"
  user-layout
  :user-layout-store="store"
  @user-layout-reset="onReset" />
```

Three behaviours are worth knowing because each is load-bearing:

- **The `layout` prop is never mutated when `userLayout` is on.** Drag and resize normally write back into it in place, so the in-place manifest editor can diff them. That is right for an admin editing the page for everyone and wrong for a user arranging it for themselves, so a user's arrangement lives in the component and the prop is left alone.
- **One save per edit session, on the way out.** Saving per drag writes a record per pixel gesture and races the next drag. Nothing is written when a session changed nothing.
- **Every failure falls back to the manifest.** A record that has not loaded, an instance with no preference route, a user who never arranged the page: all three render the page the admin shipped.

Call `resetUserLayout()` to drop the arrangement; the page emits `user-layout-reset` and returns to the manifest.

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `header-actions` | — | Extra buttons shown in the page header (right side, before the edit toggle) |
| `actions` | — | Back-compat alias for `header-actions`; prefer `header-actions` in new code |
| `widget-{widgetId}` | `{ item, widget }` | Custom widget content for a widget with the given ID |
| `empty` | — | Custom empty state when no widgets are in the layout |
