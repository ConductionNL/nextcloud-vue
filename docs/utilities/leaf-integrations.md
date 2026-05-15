# leafIntegrations

Ordered array of 18 leaf integration descriptors that mirror OpenRegister's leaf `IntegrationProvider`s in `openregister/lib/Service/Integration/Providers/`. Each maps the registry surface to the generic [`CnIntegrationTab`](../components/cn-integration-tab.md) sidebar tab plus the generic [`CnIntegrationCard`](../components/cn-integration-card.md) widget.

Most consumers don't touch this directly — call [`registerLeafIntegrations()`](./register-leaf-integrations.md) instead. Use the array when you want to inspect or filter the leaf set (e.g. registering a subset for a specific app, or reading `defaultSize` for a custom layout).

## Signature

```js
import { leafIntegrations } from '@conduction/nextcloud-vue'

leafIntegrations.map((d) => d.id)
// ['calendar', 'contacts', 'email', 'talk',
//  'bookmarks', 'collectives', 'maps', 'photos',
//  'activity', 'analytics', 'cospend', 'deck',
//  'flow', 'forms', 'polls', 'time-tracker',
//  'shares', 'openproject']
```

## Descriptor shape

Each entry is a ready-to-`register()` integration descriptor: `{ id, label, icon, group, requiredApp, order, referenceType, tab, widget, defaultSize }`. See the [registration shape](../guides/integrations.md#registration-shape) reference for the full contract.

| id | order | group | requiredApp |
|---|---|---|---|
| `shares` | 10 | `core` | — |
| `calendar` | 20 | `comms` | `calendar` |
| `contacts` | 21 | `comms` | `contacts` |
| `email` | 22 | `comms` | `mail` |
| `talk` | 23 | `comms` | `spreed` |
| `openproject` | 31 | `external` | `openconnector` |
| `bookmarks` | 40 | `docs` | `bookmarks` |
| `collectives` | 41 | `docs` | `collectives` |
| `maps` | 42 | `docs` | `maps` |
| `photos` | 43 | `docs` | `photos` |
| `activity` | 60 | `workflow` | `activity` |
| `analytics` | 61 | `workflow` | `analytics` |
| `cospend` | 62 | `workflow` | `cospend` |
| `deck` | 63 | `workflow` | `deck` |
| `flow` | 64 | `workflow` | `workflowengine` |
| `forms` | 65 | `workflow` | `forms` |
| `polls` | 66 | `workflow` | `polls` |
| `time-tracker` | 67 | `workflow` | `timemanager` |

All 18 use [`CnIntegrationTab`](../components/cn-integration-tab.md) + [`CnIntegrationCard`](../components/cn-integration-card.md). Bespoke per-leaf components supersede them later by repointing the descriptor's `tab` / `widget`.

## See also

- [`registerLeafIntegrations`](./register-leaf-integrations.md) — register the whole set onto a registry
- [`integrations`](./integrations.md) — the registry singleton
- [Pluggable integration registry guide](../guides/integrations.md)
