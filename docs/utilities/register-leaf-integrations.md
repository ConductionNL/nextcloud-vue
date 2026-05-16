# registerLeafIntegrations

Registers the 18 leaf integrations ([`leafIntegrations`](./leaf-integrations.md)) onto an integration registry: `calendar`, `contacts`, `email`, `talk`, `bookmarks`, `collectives`, `maps`, `photos`, `activity`, `analytics`, `cospend`, `deck`, `flow`, `forms`, `polls`, `time-tracker`, `shares`, `openproject`.

Consuming apps that pre-register the integration set call this once at bootstrap, right after [`installIntegrationRegistry()`](./install-integration-registry.md) and [`registerBuiltinIntegrations()`](./register-builtin-integrations.md), so every leaf surfaces in the sidebar / admin UI / OCS capabilities before any per-app overrides land.

## Collision behaviour

Existing registrations win (AD-13 collision policy: first wins). `registerLeafIntegrations()` skips any id that is already registered — quietly, without the dev-mode collision warning. So a consuming app can **pre-register** a leaf id with a bespoke tab / widget before this runs, and the generic registration won't clobber it.

## Signature

```js
import { registerLeafIntegrations } from '@conduction/nextcloud-vue'

registerLeafIntegrations()            // onto the default singleton
registerLeafIntegrations(myRegistry)  // onto an isolated registry (tests)
```

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `registry` | `object?` | the [`integrations`](./integrations.md) singleton | Registry instance to populate. |

## Returns

`string[]` — the ids that were newly registered (ids already present are skipped and excluded from the return value).

## See also

- [`leafIntegrations`](./leaf-integrations.md) — the 18 descriptors
- [`registerBuiltinIntegrations`](./register-builtin-integrations.md) — call this first
- [`installIntegrationRegistry`](./install-integration-registry.md) — bootstrap the registry singleton
- [Pluggable integration registry guide](../guides/integrations.md)
