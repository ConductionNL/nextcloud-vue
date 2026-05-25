# CnIntegrationWidget

Tabbed, app-faithful integration widget for OpenRegister object-detail pages and dashboards. Gives every registered integration its own tab (app icon + label + accent), composing each leaf's bespoke content component (`provider.tab`).

Supersedes the generic Phase E pair (CnIntegrationCard / [CnIntegrationWidgetGrid](./cn-integration-widget-grid.md)) which rendered a one-size surface that erased each integrated app's visual identity. Has two modes: an all-integrations tabbed view, and a single-integration mode for manifest multi-placement.

See the [Pluggable Integration Registry](../../CLAUDE.md) section for registration.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `surface` | String | `'detail-page'` | Surface the widget renders for (`'detail-page'` \| `'single-entity'` \| dashboard surfaces). |
| `integrationContext` | Object | `null` | `{ register, schema, objectId }` forwarded to each leaf tab so it can scope its data to the current object. |
| `integrationId` | String | `''` | When set, renders only that one integration (single-integration mode) instead of the full tab strip. |

## Usage

```vue
<CnIntegrationWidget
  surface="detail-page"
  :integration-context="{ register, schema, objectId }" />
```

## Additional props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `registry` | Object | — | Override integration registry (defaults to the shared singleton). |
| `include` | Array | `null` | Allowlist of integration ids to render (others hidden). |
| `apiBase` | String | — | Base path for integration API calls. |
| `objectType` | String | `''` | Object type/schema the widget is bound to. |
