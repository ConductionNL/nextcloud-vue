# CnIntegrationCard

Generic surface-aware widget for the [pluggable integration registry](../guides/integrations.md). Used as the `widget` component for the 18 [leaf integrations](../utilities/leaf-integrations.md) that don't yet need a bespoke widget — every leaf registration points its `widget` at this component and passes the integration's id via the registration descriptor.

Branches on the `surface` prop per AD-19:

| surface | Renders |
|---|---|
| `detail-page` | Full list of linked things (title + subtitle). |
| `user-dashboard` / `app-dashboard` | Compact list (max 5 items). |
| `single-entity` | One row chip, resolved via the `value` prop when a schema property declares `referenceType: '<id>'` (AD-18). |

Same `/api/objects/{register}/{schema}/{objectId}/integrations/{id}` endpoint as [`CnIntegrationTab`](./cn-integration-tab.md); a 503 from the endpoint renders a quiet "currently unavailable" state.

**Wraps**: `CnDetailCard`

## Usage

You don't normally mount `CnIntegrationCard` directly — `CnDashboardPage` / `CnDetailPage` / `CnFormDialog` resolve it from the registry. To register a leaf using the generic widget:

```js
import { CnIntegrationTab, CnIntegrationCard } from '@conduction/nextcloud-vue'

window.OCA.OpenRegister.integrations.register({
  id: 'bookmarks',
  label: t('myapp', 'Bookmarks'),
  icon: 'Bookmark',
  requiredApp: 'bookmarks',
  group: 'docs',
  tab: CnIntegrationTab,
  widget: CnIntegrationCard,
})
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `integrationId` | String | — (required) | Stable provider id (matches PHP-side). |
| `register` | String | — (required) | OpenRegister register id (slug or uuid). |
| `schema` | String | — (required) | OpenRegister schema id (slug or uuid). |
| `objectId` | String | — (required) | Parent object uuid. |
| `surface` | String | `'detail-page'` | One of `'user-dashboard'`, `'app-dashboard'`, `'detail-page'`, `'single-entity'`. |
| `value` | String | `''` | Single-entity reference (id or canonical). |
| `title` | String | `''` | Override the card title (defaults to integration id). |
| `icon` | Object | LinkVariant | Optional MDI component for the card icon. |
| `apiBase` | String | `'/apps/openregister/api'` | Base API URL. |
| `collapsible` | Boolean | `true` | Whether the card body is collapsible. |
| `emptyLabel` | String | translated `'Nothing linked yet'` | Empty-state label. |
| `unavailableLabel` | String | translated `'This integration is currently unavailable.'` | 503 state copy. |

## See also

- [`CnIntegrationTab`](./cn-integration-tab.md) — the matching sidebar tab
- [`leafIntegrations`](../utilities/leaf-integrations.md) — the 18 leaf descriptors that use this component
- [Pluggable integration registry guide](../guides/integrations.md)
