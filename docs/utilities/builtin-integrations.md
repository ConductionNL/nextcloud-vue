# builtinIntegrations

Ordered array of the five always-available integration descriptors that mirror OpenRegister's built-in PHP `IntegrationProvider`s: `files`, `notes`, `tags`, `tasks`, `audit-trail`. Each maps onto its existing [`CnObjectSidebar`](../components/cn-object-sidebar.md) tab plus a compact widget (`CnFilesCard` / `CnNotesCard` / `CnTagsCard` / `CnTasksCard` / `CnAuditTrailCard`) for dashboard and detail surfaces.

Most consumers don't touch this directly — call [`registerBuiltinIntegrations()`](./register-builtin-integrations.md) instead. Use the array when you want to inspect or filter the built-in set (e.g. registering a subset, or reading `defaultSize` for a layout).

## Signature

```js
import { builtinIntegrations } from '@conduction/nextcloud-vue'

builtinIntegrations.map((d) => d.id) // ['files', 'notes', 'tags', 'tasks', 'audit-trail']
```

## Descriptor shape

Each entry is a ready-to-`register()` integration descriptor: `{ id, label, icon, requiredApp, order, group, referenceType, tab, widget, defaultSize }`. See the [registration shape](../guides/integrations.md#registration-shape) reference for the full contract.

| id | order | group | tab | widget |
|---|---|---|---|---|
| `files` | 1 | `core` | `CnFilesTab` | `CnFilesCard` |
| `notes` | 2 | `core` | `CnNotesTab` | `CnNotesCard` (adapter) |
| `tags` | 3 | `core` | `CnTagsTab` | `CnTagsCard` |
| `tasks` | 4 | `core` | `CnTasksTab` | `CnTasksCard` (adapter) |
| `audit-trail` | 5 | `core` | `CnAuditTrailTab` | `CnAuditTrailCard` |

## See also

- [`registerBuiltinIntegrations`](./register-builtin-integrations.md) — register all five onto a registry
- [`integrations`](./integrations.md) — the registry singleton
- [Pluggable integration registry guide](../guides/integrations.md)
