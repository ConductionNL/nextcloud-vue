# CnWidgetWrapper

Container shell around a dashboard widget. Provides a header with icon and title, a scrollable content area, and an optional footer with action links. Accepts a `styleConfig` object for runtime style overrides (background, border, padding). Used internally by `CnDashboardPage` for all non-tile widgets.

## Usage

```vue
<!-- Basic wrapper -->
<CnWidgetWrapper title="My Cases" icon-url="/apps/myapp/img/icon.svg">
  <MyCasesChart :data="chartData" />
</CnWidgetWrapper>

<!-- Without header (borderless, flush — for self-contained card widgets) -->
<CnWidgetWrapper :show-title="false" :borderless="true">
  <CnStatsBlock :stats="kpis" />
</CnWidgetWrapper>

<!-- With NC widget object (used by CnDashboardPage internally) -->
<CnWidgetWrapper
  :title="widget.title"
  :icon-url="widget.iconUrl"
  :icon-class="widget.iconClass"
  :buttons="widget.buttons">
  <CnWidgetRenderer :widget="widget" />
</CnWidgetWrapper>

<!-- With custom footer and header actions -->
<CnWidgetWrapper title="Tasks">
  <template #actions>
    <NcButton type="tertiary" @click="refresh">Refresh</NcButton>
  </template>
  <TaskList :items="tasks" />
  <template #footer>
    <a href="/apps/tasks">View all</a>
  </template>
</CnWidgetWrapper>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `'Widget'` | Widget title shown in the header |
| `showTitle` | Boolean | `true` | Whether to render the header bar |
| `borderless` | Boolean | `false` | Remove border and background — makes the wrapper transparent |
| `flush` | Boolean | `false` | Remove content padding — lets content extend edge-to-edge |
| `iconUrl` | String | `null` | Image URL for the header icon |
| `iconClass` | String | `null` | CSS class for the header icon (e.g. Nextcloud icon class) |
| `titleIconPosition` | String | `'right'` | Position of the `title-icon` slot in the header: `'left'` places it before the title group; `'right'` places it after the actions |
| `titleIconColor` | String | `null` | CSS color value applied to the `title-icon` slot container (e.g. `'#e74c3c'`) |
| `buttons` | Array | `[]` | Footer button links: `[{ text, link }]` |
| `styleConfig` | Object | `{}` | Runtime style overrides: `{ backgroundColor?, borderStyle?, borderWidth?, borderColor?, borderRadius?, padding?: { top, right, bottom, left } }` |

### Slots

| Slot | Description |
|------|-------------|
| default | Widget content rendered in the scrollable body area |
| `actions` | Buttons or controls placed in the right side of the header |
| `title-icon` | Extra icon element rendered in the header at the position controlled by `titleIconPosition` (left of title or right of actions) |
| `footer` | Custom footer content (replaces the `buttons` prop rendering) |
