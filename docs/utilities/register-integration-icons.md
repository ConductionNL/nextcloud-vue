# registerIntegrationIcons

Registers every MDI icon referenced by a built-in or leaf integration descriptor with `CnIcon`'s icon registry, so integration tabs/widgets can resolve their declared `icon:` names.

Idempotent — safe to call from multiple component module loads and from a host app's bootstrap; subsequent calls are no-ops. Registers the [`INTEGRATION_ICON_COMPONENTS`](./integration-icon-components.md) map.

## Signature

```js
registerIntegrationIcons(): void
```

## Usage

```js
import { registerIntegrationIcons } from '@conduction/nextcloud-vue'

// In the consuming app's main.js bootstrap:
registerIntegrationIcons()
```
