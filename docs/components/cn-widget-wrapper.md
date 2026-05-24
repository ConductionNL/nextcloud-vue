import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnWidgetWrapper.md'

# CnWidgetWrapper

Container shell around a dashboard widget. Provides a header with icon and title, a scrollable content area, and an optional footer with action links. Accepts a `styleConfig` object for runtime style overrides (background, border, padding). Used internally by `CnDashboardPage` for all non-tile widgets.

## Try it

<Playground component="CnWidgetWrapper" />

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

## Built-in Actions menu

`CnWidgetWrapper` ships with a small overflow `…` menu in the header containing two actions, both functional **without any host wiring** when the wrapper is mounted under `CnAppRoot`:

- **Refresh** — emits `@refresh`, then (unless the host listener calls `event.preventDefault()`) emits on the `@nextcloud/event-bus` channel `cn:widget:refresh` with payload `{ widgetId, title }`. Widgets that care subscribe and filter by `widgetId`.
- **Request a feature** — emits `@request-feature`, then (unless suppressed) auto-mounts `CnSuggestFeatureModal` with `app + page + surface=widget:<id>` context auto-filled from `CnAppRoot` injects. The host can override the default by binding `@request-feature` and calling `event.preventDefault()` to handle it themselves.

Opt out per-instance with `:show-refresh="false"` and/or `:show-request-feature="false"` (the legacy `hide-refresh` / `hide-request-feature` aliases also still work for back-compat). When both are hidden and no `#action-items` slot content is supplied, the overflow menu disappears entirely.

Set `:widget-id` so the event-bus payload + modal surface tag are stable across renames; otherwise the wrapper falls back to a slugified `title`.

## Opting into Refresh

A widget can opt in to Refresh in one of three ways. Pick whichever fits the widget's existing reactivity model — all three are first-class.

### 1. Ref-callable `refresh()` method (canonical)

The cleanest pattern: expose a method, let the host call it through the ref.

```vue
<template>
  <CnWidgetWrapper title="Outgoing calls" widget-id="outgoing-calls-daily">
    <CallsChart ref="chart" />
  </CnWidgetWrapper>
</template>

<script>
export default {
  // Inside CallsChart.vue:
  methods: {
    async refresh() {
      this.data = await this.$store.dispatch('callLogs/refetch')
    },
  },
}
</script>
```

The host listens via the event-bus channel and routes by id (see mode 3 below for the wiring), or the wrapper invokes the method directly when integrated.

### 2. Reactive `refreshTrigger` prop

Useful when the widget cannot easily expose a ref (e.g. async-loaded). The host increments a timestamp; the widget watches it.

```vue
<template>
  <CnWidgetWrapper title="Outgoing calls" widget-id="outgoing-calls-daily">
    <CallsChart :refresh-trigger="callsRefreshTrigger" />
  </CnWidgetWrapper>
</template>

<script>
import { subscribe } from '@nextcloud/event-bus'
export default {
  data() {
    return { callsRefreshTrigger: 0 }
  },
  mounted() {
    subscribe('cn:widget:refresh', ({ widgetId }) => {
      if (widgetId === 'outgoing-calls-daily') {
        this.callsRefreshTrigger = Date.now()
      }
    })
  },
}
</script>
```

### 3. Event-bus subscription (direct)

The widget subscribes itself; no host plumbing needed.

```vue
<script>
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
export default {
  props: { widgetId: { type: String, required: true } },
  mounted() {
    this._onRefresh = ({ widgetId }) => {
      if (widgetId === this.widgetId) this.refetch()
    }
    subscribe('cn:widget:refresh', this._onRefresh)
  },
  beforeDestroy() {
    unsubscribe('cn:widget:refresh', this._onRefresh)
  },
  methods: {
    async refetch() { /* ... */ },
  },
}
</script>
```

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnWidgetWrapper.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnWidgetWrapper/CnWidgetWrapper.vue) and update automatically whenever the component changes.

<GeneratedRef />
