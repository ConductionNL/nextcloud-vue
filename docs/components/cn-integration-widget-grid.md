# CnIntegrationWidgetGrid

Responsive grid of every registered integration's widget for a given dashboard surface (`app-dashboard` or `user-dashboard`).

Iterates `useIntegrationRegistry().integrations.value`, resolves each provider's surface-appropriate widget via the registry's AD-19 fallback rule, and mounts them in a 3/2/1-column responsive grid. Per ADR-019 the umbrella grid is ignorant of leaf data shapes — each leaf's widget renders itself for its declared surface.

See the [Pluggable Integration Registry](../integrations/registry.md) section for how apps register integrations. For the richer per-object detail surface, prefer [CnIntegrationWidget](./cn-integration-widget.md).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `surface` | String | `'app-dashboard'` | Which dashboard surface to render each integration's widget for (`'app-dashboard'` \| `'user-dashboard'`). |

## Usage

```vue
<CnIntegrationWidgetGrid surface="app-dashboard" />
```

## Additional props & slots

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | Number | `3` | Max columns in the responsive grid (falls back to 2/1 at narrower widths). |
| `referenceContext` | Object | `null` | `{ register, schema, objectId }` forwarded to each integration widget. |
| `emptyLabel` | String | — | Label shown when no integrations are registered for the surface. |

| Slot | Description |
|------|-------------|
| `empty` | Custom empty state when no integrations are registered. |
