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
| `chrome` | String | `'default'` | Card chrome variant. `'default'` uses the library card chrome; `'nc-dashboard'` reproduces the native Nextcloud Dashboard panel exactly (translucent blurred background via `--color-main-background-blur` + `--filter-background-blur`, `--border-radius-container-large` corners, no border/shadow, 16px header with a 20px/700 title and 32px leading icon, content inset 16px). `styleConfig` overrides still layer on top. |
| `showActions` | Boolean | `true` | Whether the header's overflow action menu (Refresh / Documentation / Request-a-feature + `#action-items`) renders. Set `false` for compact surfaces (e.g. a KPI tile) to drop the menu and free header width. |
| `borderless` | Boolean | `false` | Remove border and background — makes the wrapper transparent |
| `flush` | Boolean | `false` | Remove content padding — lets content extend edge-to-edge |
| `iconUrl` | String | `null` | Image URL for the header icon |
| `iconClass` | String | `null` | CSS class for the header icon (e.g. Nextcloud icon class) |
| `titleIconPosition` | String | `'right'` | Position of the `title-icon` slot in the header: `'left'` places it before the title group; `'right'` places it after the actions |
| `titleIconColor` | String | `null` | CSS color value applied to the `title-icon` slot container (e.g. `'#e74c3c'`) |
| `buttons` | Array | `[]` | Footer button links: `[{ text, link }]` |
| `styleConfig` | Object | `{}` | Runtime style overrides: `{ backgroundColor?, borderStyle?, borderWidth?, borderColor?, borderRadius?, padding?: { top, right, bottom, left }, headerStyle?: { backgroundColor?, textColor? } }`. The optional `headerStyle` colours the header bar per-widget. |
| `refreshing` | Boolean | `false` | When bound (e.g. `:refreshing="loading"` around the host's refetch), the Refresh item is disabled and shows a loading spinner for exactly as long as this stays `true` — so the spinner reflects the real refresh time. |

### Slots

| Slot | Description |
|------|-------------|
| default | Widget content rendered in the scrollable body area |
| `actions` | Buttons or controls placed in the right side of the header |
| `title-icon` | Extra icon element rendered in the header at the position controlled by `titleIconPosition` (left of title or right of actions) |
| `footer` | Custom footer content (replaces the `buttons` prop rendering) |

## Built-in Actions menu

`CnWidgetWrapper` ships with a small overflow `…` menu in the header — the shared [`CnActionsMenu`](./cn-actions-menu.md) — containing up to three actions. Documentation and Request-a-feature are functional **without any host wiring** when the wrapper is mounted under `CnAppRoot`; **Refresh is shown only when something will handle it** (see below):

- **Refresh** — **shown only when it will do something.** `showRefresh` is tri-state: `true`/`false` force it on/off, and the default (`null`) is **auto** — the item renders only when a parent has attached an `@refresh` listener. This prevents dead buttons on widgets that can't refresh (e.g. a prop-driven `CnObjectDataWidget`) and on detail-page auto-body widgets where the page owns refresh. A widget that wants a manual Refresh while refreshing itself via the bus (no `@refresh` listener) can set `:show-refresh="true"` explicitly. When shown and clicked it emits `@refresh`, then (unless the host listener calls `event.preventDefault()`) emits on the `@nextcloud/event-bus` channel `cn:widget:refresh` with payload `{ widgetId, title }`.
- **Documentation** — rendered only when a `documentationUrl` is supplied. Opens the host-provided link in a new tab (`target="_blank"`, `rel="noopener noreferrer"`); no JS handler. Apps pass the URL from the widget configuration (`:documentation-url="widget.documentationUrl"`); customise the wording with `documentationLabel`.
- **Request a feature** — on by default; emits `@request-feature`, then (unless suppressed) opens the forge's feature-request issue form in a new tab with the `widget:<id>` surface as its English headline, built from the `CnAppRoot` injects. The host can override the default by binding `@request-feature` and calling `event.preventDefault()` to handle it themselves.

Force Refresh on/off per-instance with `:show-refresh="true"`/`:show-refresh="false"` (the legacy `hide-refresh` alias still opts out for back-compat); opt out of Request-a-feature with `:show-request-feature="false"` (the legacy `hide-request-feature` alias also still works). When everything is hidden — Refresh auto-hidden or opted out, Request-a-feature opted out, no `documentationUrl`, and no `#action-items` slot content — the overflow menu disappears entirely. To drop the entire actions area in one go — e.g. on a compact KPI tile whose only header affordance is a date chip — set `:show-actions="false"`.

Set `:widget-id` so the event-bus payload + modal surface tag are stable across renames; otherwise the wrapper falls back to a slugified `title`.

## Opting into Refresh

Because Refresh auto-hides unless a parent attaches an `@refresh` listener, opting in is the act of wiring one of the patterns below. A widget that refreshes itself purely via the bus (no `@refresh` listener — mode 3) must also pass `:show-refresh="true"` so the action renders.

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
  <CnWidgetWrapper title="Outgoing calls" widget-id="outgoing-calls-daily" :show-refresh="true">
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

## Additional props & slots

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `specRef` | String | `''` | Accepted for backward compatibility with the removed in-product suggestion modal; no longer forwarded. |
| `documentationUrl` | String | `''` | When set, renders a **Documentation** item in the overflow menu that opens this link in a new tab. Empty hides it. |
| `documentationLabel` | String | `t('Documentation')` | Pre-translated label for the Documentation action. |
| `refreshLabel` | String | `t('Refresh')` | Pre-translated label for the Refresh action. |
| `requestFeatureLabel` | String | `t('Request a feature')` | Pre-translated label for the Request-a-feature action. |
| `actionsMenuLabel` | String | `t('Actions')` | Pre-translated aria-label / tooltip for the overflow `…` menu trigger. |

| Slot | Description |
|------|-------------|
| `title-meta` | Inline content rendered next to the title (e.g. the dashboard date-range chip). |

## Coloured header icon

Every widget's header icon is coloured — `titleIconVariant` defaults to `primary`, so no configuration is needed. A widget whose subject already carries a meaning names it instead: a Concepts list is `warning`, a Published list `success`, a Depublished list `error`. `titleIconColor` overrides the variant with an explicit CSS variable (never a literal hex — that would ignore the nldesign app's re-theming).

The colour is published once as `--cn-widget-icon-color` on the header and cascades to every icon under it.

## Actions menu props

| Prop | Type | Default | Description |
|---|---|---|---|
| `docsAnchor` | String | `''` | This widget's own section in the app's documentation, appended to the app-wide base so the Documentation entry deep-links to this widget rather than the docs homepage. Prefer it over `documentationUrl`. |
| `showDocumentation` | Boolean | `true` | Whether the Documentation entry renders. |
| `showReportBug` | Boolean | `true` | Whether the Report-a-bug entry renders. |
| `reportBugUrl` | String | `''` | Explicit bug-report target; empty builds a new-issue deep-link on the app's own forge. |
| `titleIconVariant` | String | `'primary'` | Semantic header-icon colour (`primary`/`success`/`warning`/`error`/`info`/`neutral`). |

Request a feature / Report a bug / Documentation render on every widget.
