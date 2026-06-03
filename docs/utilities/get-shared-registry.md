# getSharedRegistry

Resolves the **one** integration registry shared across every app bundle on the page — the instance held at `window.OCA.OpenRegister.integrations` — installing this bundle's module singleton there when none exists yet (and draining any [stub queue](./register-integration.md)). Idempotent.

This is the entry point **OpenRegister's global bootstrap** uses so that `registerBuiltinIntegrations` / `registerLeafIntegrations` / `registerIntegrationIcons` populate the single registry every consuming app reads via [`useIntegrationRegistry`](./composables/use-integration-registry.md). First bundle to install wins; all later callers converge on it.

```js
import { getSharedRegistry, registerBuiltinIntegrations, registerLeafIntegrations } from '@conduction/nextcloud-vue'

const registry = getSharedRegistry()          // window-global, install-if-needed
registerBuiltinIntegrations(registry)
registerLeafIntegrations(registry)
```

## Signature

```js
getSharedRegistry()            // resolve against window
getSharedRegistry(fakeWindow)  // resolve against a test double
```

Returns a real registry instance (never a stub). See [`sharedRegistryIfInstalled`](./shared-registry-if-installed.md) for the read-only counterpart used by the consumer read path.
