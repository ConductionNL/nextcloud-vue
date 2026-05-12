# createIntegrationRegistry

Factory for an isolated [pluggable integration registry](../guides/integrations.md) instance. Most call sites should use the default [`integrations`](./integrations.md) singleton — reach for this factory only when you need test isolation so registrations don't leak across cases.

## Signature

```js
import { createIntegrationRegistry } from '@conduction/nextcloud-vue'

const reg = createIntegrationRegistry()
reg.register({ id: 'forms', label: 'Forms', tab, widget })
expect(reg.list().map((p) => p.id)).toEqual(['forms'])
```

## Returns

The same API surface as [`integrations`](./integrations.md): `register`, `unregister`, `list`, `get`, `has`, `resolveWidget`, `onChange`, plus the private `__resetForTests()` for explicit teardown.

## See also

- [`integrations`](./integrations.md) — default singleton
- [`useIntegrationRegistry`](./composables/use-integration-registry.md) — Vue composable, accepts a registry override for tests
