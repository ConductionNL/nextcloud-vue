# CnIntegrationTab

Generic sidebar tab for the [pluggable integration registry](../guides/integrations.md). Used as the `tab` component for the 18 [leaf integrations](../utilities/leaf-integrations.md) that don't yet need a bespoke UI — every leaf registration points its `tab` at this component and passes the integration's id via the registration descriptor.

Fetches from OpenRegister's pluggable-integration sub-resource (`/api/objects/{register}/{schema}/{objectId}/integrations/{integrationId}`), renders rows generically (title / optional subtitle or breadcrumb / optional external `url`), and supports unlink. A 503 from the endpoint renders a quiet "currently unavailable" banner; 501 hides the unlink action.

Bespoke per-leaf tabs supersede this one by repointing the registration's `tab` to a dedicated Vue component (collision policy: first wins).

## Usage

You don't normally mount `CnIntegrationTab` directly — `CnObjectSidebar` with `:use-registry="true"` resolves it from the registry. To register a leaf using the generic tab:

```js
import { CnIntegrationTab, CnIntegrationCard } from '@conduction/nextcloud-vue'

window.OCA.OpenRegister.integrations.register({
  id: 'calendar',
  label: t('myapp', 'Meetings'),
  icon: 'Calendar',
  requiredApp: 'calendar',
  group: 'comms',
  tab: CnIntegrationTab,
  widget: CnIntegrationCard,
})
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `integrationId` | String | — (required) | Stable provider id (matches PHP-side). |
| `objectId` | String | — (required) | Parent object uuid. |
| `register` | String | `''` | OpenRegister register id (slug or uuid). |
| `schema` | String | `''` | OpenRegister schema id (slug or uuid). |
| `apiBase` | String | `'/apps/openregister/api'` | Base API URL. |
| `allowUnlink` | Boolean | `true` | Whether the per-row unlink button is shown. |
| `emptyLabel` | String | translated `'Nothing linked yet'` | Empty-state label. |
| `unlinkLabel` | String | translated `'Unlink'` | aria-label for the unlink button. |
| `unavailableLabel` | String | translated `'This integration is currently unavailable.'` | 503 banner copy. |

## Events

| Event | Payload | When |
|---|---|---|
| `unlinked` | `string` — the row's id | After a row is successfully unlinked. |

## See also

- [`CnIntegrationCard`](./cn-integration-card.md) — the matching widget for dashboard / detail / single-entity surfaces
- [`leafIntegrations`](../utilities/leaf-integrations.md) — the 18 leaf descriptors that use this component
- [Pluggable integration registry guide](../guides/integrations.md)
