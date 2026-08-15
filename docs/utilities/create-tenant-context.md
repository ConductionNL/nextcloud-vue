# createTenantContext

Builds a stand-alone tenant context object — same shape that [`provideTenantContext`](./provide-tenant-context.md) installs and [`useTenantContext`](./composables/use-tenant-context.md) returns — without calling Vue's `provide()`. Mainly useful for unit tests that want to assert against the reactive state directly without mounting a provider/consumer pair.

Spec: `openspec/changes/multi-tenancy-context`.

## Signature

```js
import { createTenantContext } from '@conduction/nextcloud-vue'

const ctx = createTenantContext(initialUuid, initialOrganisation)
```

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `initialUuid` | `string \| null` | `null` | Initial `activeOrganisationUuid` value. |
| `initialOrganisation` | `object \| null` | `null` | Initial resolved organisation entity. |

## Return value

```js
{
	activeOrganisationUuid,  // Ref<string|null>
	activeOrganisation,       // Ref<object|null>
	setActiveTenant,          // (uuid | { uuid, organisation? }, organisation?) => void
	onTenantSwitch,           // (cb) => off()
	tenantSwitch,             // raw event bus { emit, on }
}
```

Mutating the returned `setActiveTenant` writes to the local refs and emits `tenantSwitch` only when the UUID actually changes — same semantics as the provider-installed context.

## Usage — tests

```js
import { createTenantContext } from '@conduction/nextcloud-vue'

it('emits tenantSwitch on UUID change', () => {
	const ctx = createTenantContext('org-a')
	const seen = []
	ctx.onTenantSwitch((event) => seen.push(event))

	ctx.setActiveTenant('org-b')
	expect(seen).toHaveLength(1)
	expect(seen[0]).toMatchObject({ previousUuid: 'org-a', uuid: 'org-b' })

	// Idempotent: same uuid does not re-emit
	ctx.setActiveTenant('org-b')
	expect(seen).toHaveLength(1)
})
```

## Production use

Production code should prefer [`provideTenantContext`](./provide-tenant-context.md) so the same shared context flows through Vue's `provide`/`inject` to every nested component, store, and dialog. `createTenantContext` is the low-level primitive both helpers wrap.

## Related

- [`provideTenantContext`](./provide-tenant-context.md) — wraps `createTenantContext` with `provide()`.
- [`useTenantContext`](./composables/use-tenant-context.md) — consumer side.
- [`TENANT_CONTEXT_KEY`](./tenant-context-key.md) — injection key.
