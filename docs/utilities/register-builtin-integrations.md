# registerBuiltinIntegrations

Registers the five always-available integrations ([`builtinIntegrations`](./builtin-integrations.md)) onto an integration registry: `files`, `notes`, `tags`, `tasks`, `audit-trail`.

OpenRegister's main bundle calls this once at bootstrap, right after [`installIntegrationRegistry()`](./install-integration-registry.md), so the built-ins are present before any consuming app registers its own. Consuming apps don't normally call it directly.

## Collision behaviour

Existing registrations win (AD-13 collision policy: first wins). `registerBuiltinIntegrations()` skips any id that is already registered — quietly, without the dev-mode collision warning. This means a consuming app can **pre-register** an id (e.g. its own richer `notes` provider) before OpenRegister's bundle loads, and the built-in won't clobber it.

## Signature

```js
import { registerBuiltinIntegrations } from '@conduction/nextcloud-vue'

registerBuiltinIntegrations()            // onto the default singleton
registerBuiltinIntegrations(myRegistry)  // onto an isolated registry (tests)
```

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `registry` | `object?` | the [`integrations`](./integrations.md) singleton | Registry instance to populate. |

## Returns

`string[]` — the ids that were newly registered (ids already present are skipped and excluded from the return value).

## See also

- [`builtinIntegrations`](./builtin-integrations.md) — the descriptor array
- [`installIntegrationRegistry`](./install-integration-registry.md) — call this first
- [Pluggable integration registry guide](../guides/integrations.md)
