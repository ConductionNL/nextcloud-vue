# CnIntegrationWidget

Tabbed, app-faithful integration widget for OpenRegister object-detail pages and dashboards. Gives every registered integration its own tab (app icon + label + accent), composing each leaf's bespoke content component (`provider.tab`).

Supersedes the generic Phase E pair (CnIntegrationCard / [CnIntegrationWidgetGrid](./cn-integration-widget-grid.md)) which rendered a one-size surface that erased each integrated app's visual identity. Has two modes: an all-integrations tabbed view, and a single-integration mode for manifest multi-placement.

See the [Pluggable Integration Registry](../integrations/registry.md) section for registration.

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
| `documentation-url` | `String` | `''` | Documentation link for the overflow Actions menu. |
| `widget-id` | `String` | `''` | Stable id forwarded to the menu. |
| `objectLabel` | `String` | `''` | The record's display name, handed to the leaf as `objectLabel`. |
| `leafSurface` | `String` | `''` | The surface the leaf is told it renders on when it differs from `surface` (a leaf in a dialog that keeps its `sidebar-tab` look). |
| `appName` | `String` | `''` | The app that provides the `only` leaf. When that leaf is not registered, the widget shows "{App} not available" with the install hint instead of the plain line. |
| `appIcon` | `String` | `''` | The icon of that empty state. |

## Mount-mode leaves

In single mode (`only`) a leaf that mounts its own framework (`renderMode: 'mount'`, ADR-066) is mounted through [CnLeafMountHost](./cn-leaf-mount-host.md) with the record context, `integrationContext` and `objectLabel`, the same way a detail page mounts it:

```vue
<CnIntegrationWidget only="decidiq-approval-chain" surface="detail-page" leafSurface="sidebar-tab" register="dossiq" schema="informatieobject" :objectId="documentId" :objectLabel="documentTitle" appName="Decidiq" />
```

On a detail page an `integration` widget whose leaf is not registered shows the same "{App} not available" state, named after the widget's `appName` (or its `requiredApp`), instead of nothing.
