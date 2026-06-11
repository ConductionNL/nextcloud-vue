# provideTenantContext

Installs the multi-tenancy provider that [`useTenantContext`](./composables/use-tenant-context.md), [`CnTenantBadge`](../components/cn-tenant-badge.md), `CnFormDialog`, `CnIndexPage`, and the store actions all read from. Call once high in the component tree (typically in `App.vue` or your shell's `setup()`).

Spec: `openspec/changes/multi-tenancy-context`.

`CnAppRoot` already calls `provideTenantContext()` for you — only call this yourself when bootstrapping a custom shell without `CnAppRoot`.

## Signature

```js
import { provideTenantContext } from '@conduction/nextcloud-vue'

const ctx = provideTenantContext(initialUuid, initialOrganisation)
```

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `initialUuid` | `string \| null` | `null` | Seed the initial `activeOrganisationUuid`. Usually pulled from `@nextcloud/initial-state`. |
| `initialOrganisation` | `object \| null` | `null` | Seed the resolved organisation entity. Optional — many apps only know the UUID at bootstrap. |

## Return value

Returns the same shape that [`useTenantContext`](./composables/use-tenant-context.md) exposes to consumers:

```js
{
	activeOrganisationUuid,   // Ref<string|null>
	activeOrganisation,        // Ref<object|null>
	setActiveTenant,           // setter
	onTenantSwitch,            // event subscriber
	tenantSwitch,              // raw event bus
}
```

Returning the shape lets the provider write to it directly (e.g. wire `setActiveTenant` to a tenant-switcher dropdown without re-injecting).

## Usage — custom shell

```js
// main.js
import Vue from 'vue'
import { provideTenantContext } from '@conduction/nextcloud-vue'
import bootstrap from '@nextcloud/initial-state'
import App from './App.vue'

const tenancy = bootstrap('myapp', 'tenancy')

new Vue({
	setup() {
		provideTenantContext(tenancy.activeOrgUuid, tenancy.activeOrg)
	},
	render: (h) => h(App),
}).$mount('#content')
```

## Usage — wiring a switcher

```vue
<template>
	<NcSelect v-model="orgUuid" :options="orgs" label="name" @input="onSwitch" />
</template>

<script>
import { useTenantContext } from '@conduction/nextcloud-vue'

export default {
	setup() {
		const { setActiveTenant } = useTenantContext()
		return { setActiveTenant }
	},

	methods: {
		onSwitch(org) {
			this.setActiveTenant({ uuid: org.uuid, organisation: org })
		},
	},
}
</script>
```

## Idempotency

Calling `provideTenantContext()` twice at the same scope overwrites the previous provider for that subtree only — Vue's `provide()` is per-instance. In normal use it's called exactly once at the app root.

## Related

- [`useTenantContext`](./composables/use-tenant-context.md) — the consumer side.
- [`createTenantContext`](./create-tenant-context.md) — build a stand-alone context without `provide()` (mainly for tests).
- [`TENANT_CONTEXT_KEY`](./tenant-context-key.md) — injection key.
- [Multi-tenancy guide](../multi-tenancy.md) — end-to-end wiring.
