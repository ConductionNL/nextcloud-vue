# registerXwikiIntegration

Registers the XWiki ("Articles") leaf integration ([`xwikiIntegration`](./xwiki-integration.md)) onto an integration registry — wiring `CnXwikiTab` + `CnXwikiCard` onto the `xwiki` id.

OpenRegister's main bundle calls this (when the `openconnector` app is installed) right after [`installIntegrationRegistry()`](./install-integration-registry.md) and [`registerBuiltinIntegrations()`](./register-builtin-integrations.md). Consuming apps don't normally call it directly.

## Collision behaviour

Skips silently if an `id: 'xwiki'` is already registered (AD-13 collision policy: first wins — no dev-mode warning here), so a consuming app can pre-register its own `xwiki` provider to override this one.

## Signature

```js
import { registerXwikiIntegration } from '@conduction/nextcloud-vue'

registerXwikiIntegration()            // onto the default singleton
registerXwikiIntegration(myRegistry)  // onto an isolated registry (tests)
```

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `registry` | `object?` | the [`integrations`](./integrations.md) singleton | Registry instance to populate. |

## Returns

`boolean` — `true` if newly registered, `false` if an `id: 'xwiki'` was already present.

## See also

- [`xwikiIntegration`](./xwiki-integration.md) — the descriptor
- [`registerBuiltinIntegrations`](./register-builtin-integrations.md) — the five always-available built-ins
- [Pluggable integration registry guide](../guides/integrations.md)
