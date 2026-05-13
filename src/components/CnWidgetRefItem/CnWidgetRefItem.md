CnWidgetRefItem resolves a `widget-ref` content item declared in a manifest page's
`config.content[]` array. It calls OR's widget-fetch API, looks up the returned
component name in the consuming app's `customComponents` registry, and renders
the resolved component.

## Usage in a manifest (Scholiq compliance dashboard)

```json
{
  "id": "compliance-dashboard",
  "type": "dashboard",
  "content": [
    { "type": "widget-ref", "ref": "openregister://widget/regulation/coverageGrid" },
    { "type": "widget-ref", "ref": "openregister://widget/regulation/boardProof" }
  ]
}
```

CnDashboardPage renders one `CnWidgetRefItem` per entry when the page's
`config.content[]` array is set. Each item resolves its widget at runtime from OR.

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `refUri` | String | Yes | The `openregister://widget/<schemaSlug>/<widgetSlug>` URI to resolve |

## States

The component moves through three states:

1. **Loading** — an `NcLoadingIcon` spinner is shown while the API call is in flight.
2. **Error** — an `NcEmptyContent` fallback with an alert icon is shown when the widget
   cannot be fetched, the API response lacks a `component` field, or the component name
   is not in the `customComponents` registry.
3. **Ready** — the resolved component is mounted with `widgetData` props (all API
   response fields except `component`).

## Standalone usage

```vue {static}
<template>
  <CnWidgetRefItem ref-uri="openregister://widget/regulation/coverageGrid" />
</template>

<script>
import { CnWidgetRefItem } from '@conduction/nextcloud-vue'

export default {
  components: { CnWidgetRefItem },
}
</script>
```

## Loading state (demo — simulated)

The following example renders the loading skeleton directly by setting
`loading: true` on the instance. In production the component enters this
state automatically while the OR API call is in flight.

```vue
<template>
  <div style="width: 400px; border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden;">
    <!-- Simulated loading state — loading is set directly for the demo -->
    <div style="display: flex; align-items: center; justify-content: center; min-height: 120px;">
      <span style="color: var(--color-text-maxcontrast); font-size: 14px;">
        ⏳ Fetching widget from OpenRegister…
      </span>
    </div>
  </div>
</template>
```

## Error state (demo — unknown component)

```vue
<template>
  <div style="width: 400px; border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden;">
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 120px; padding: 16px; text-align: center;">
      <span style="font-size: 32px;">⚠️</span>
      <p style="margin: 8px 0 0; color: var(--color-text-maxcontrast); font-size: 13px;">
        [CnWidgetRefItem] Component "CoverageGridWidget" not found in customComponents registry.
      </p>
    </div>
  </div>
</template>
```

## Two widget-refs in a dashboard page (Scholiq pattern)

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px; padding: 20px;">
    <!-- Simulated resolved widget 1 -->
    <div style="padding: 20px; border: 1px solid var(--color-border); border-radius: 8px;">
      <h3 style="margin: 0 0 8px; font-size: 16px;">Coverage Grid</h3>
      <p style="margin: 0; color: var(--color-text-maxcontrast); font-size: 13px;">
        Resolved via <code>openregister://widget/regulation/coverageGrid</code>
      </p>
    </div>
    <!-- Simulated resolved widget 2 -->
    <div style="padding: 20px; border: 1px solid var(--color-border); border-radius: 8px;">
      <h3 style="margin: 0 0 8px; font-size: 16px;">Board Proof</h3>
      <p style="margin: 0; color: var(--color-text-maxcontrast); font-size: 13px;">
        Resolved via <code>openregister://widget/regulation/boardProof</code>
      </p>
    </div>
  </div>
</template>
```
