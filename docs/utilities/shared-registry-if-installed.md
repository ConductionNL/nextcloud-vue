# sharedRegistryIfInstalled

Read-only resolver: returns the shared integration registry **if** one is already installed on `window.OCA.OpenRegister.integrations`, else `null`. **Never mutates** the global — a bare stub queue does not count as installed.

[`useIntegrationRegistry`](./composables/use-integration-registry.md) uses this for its default so a consuming app reads the same registry OpenRegister's bootstrap populated, while falling back to its own module singleton when no global is installed (standalone use, unit tests) — which keeps tests isolated since reading never installs.

```js
import { sharedRegistryIfInstalled } from '@conduction/nextcloud-vue'

const shared = sharedRegistryIfInstalled()   // registry instance or null
```

## Signature

```js
sharedRegistryIfInstalled()            // read window
sharedRegistryIfInstalled(fakeWindow)  // read a test double
```

Contrast with [`getSharedRegistry`](./get-shared-registry.md), which installs the singleton when none is present.
