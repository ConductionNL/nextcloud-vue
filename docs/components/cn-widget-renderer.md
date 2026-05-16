import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnWidgetRenderer.md'

# CnWidgetRenderer

Fetches and renders Nextcloud Dashboard API widgets (v1 and v2) using `NcDashboardWidget`. Handles loading state, empty content, and optional auto-refresh. Used internally by `CnDashboardPage` for NC-native widgets.

**Wraps**: NcDashboardWidget, NcEmptyContent

## Try it

<Playground component="CnWidgetRenderer" />

## Usage

```vue
<!-- In a CnDashboardPage widget slot (handled automatically) -->
<CnWidgetRenderer :widget="ncWidget" />

<!-- Standalone with custom unavailable text -->
<CnWidgetRenderer
  :widget="calendarWidget"
  unavailable-text="Calendar widget not available" />
```

The `widget` object typically comes from the Nextcloud Dashboard API (`/ocs/v2.php/apps/dashboard/api/v1/widgets`):

```js
// Example NC widget object
const widget = {
  id: 'calendar',
  title: 'Calendar',
  iconClass: 'icon-calendar',
  widgetUrl: '/apps/calendar',
  itemIconsRound: false,
  itemApiVersions: [2],        // triggers v2 item fetching
  reloadInterval: 300,         // auto-refresh every 5 minutes
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `widget` | Object | ✓ | Nextcloud Dashboard API widget object. Must have `id` and `itemApiVersions` for API fetching |
| `unavailableText` | String | | `'Widget not available'` — shown when the widget type is not recognized |

### Widget API versions

| `itemApiVersions` contains | Behavior |
|---|---|
| `2` | Fetches from `/apps/dashboard/api/v2/widget-items` |
| `1` | Fetches from `/apps/dashboard/api/v1/widget-items` |
| neither | Shows the unavailable fallback |

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnWidgetRenderer.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnWidgetRenderer/CnWidgetRenderer.vue) and update automatically whenever the component changes.

<GeneratedRef />
