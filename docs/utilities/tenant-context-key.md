# TENANT_CONTEXT_KEY

`Symbol` used as the Vue `provide()` / `inject()` key for the multi-tenancy context. [`provideTenantContext`](./provide-tenant-context.md) writes to it; [`useTenantContext`](./composables/use-tenant-context.md) reads from it.

Spec: `openspec/changes/multi-tenancy-context`.

## Signature

```js
import { TENANT_CONTEXT_KEY } from '@conduction/nextcloud-vue'

// TENANT_CONTEXT_KEY === Symbol('cn:tenantContext')
```

## When to use directly

Most consumers never touch this symbol — `provideTenantContext()` and `useTenantContext()` handle it for you. Reach for it directly when:

- You need to mock the inject in a test that mounts a component using `provide` shorthand:

  ```js
  import { mount } from '@vue/test-utils'
  import { TENANT_CONTEXT_KEY, createTenantContext } from '@conduction/nextcloud-vue'

  const ctx = createTenantContext('org-a')

  const wrapper = mount(MyComponent, {
  	global: {
  		provide: { [TENANT_CONTEXT_KEY]: ctx },
  	},
  })
  ```

- You are wiring a non-standard provider (e.g. injecting a Pinia-backed context) and want to expose the same shape under the same key so existing consumers keep working.

## Stability

The symbol identity is stable across builds — `useTenantContext()` consumers in one bundle can read context provided by `provideTenantContext()` in another bundle of the same library version. Cross-version compatibility is not guaranteed.

## Related

- [`useTenantContext`](./composables/use-tenant-context.md)
- [`provideTenantContext`](./provide-tenant-context.md)
- [`createTenantContext`](./create-tenant-context.md)
