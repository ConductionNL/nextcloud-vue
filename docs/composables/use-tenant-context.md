# useTenantContext

Multi-tenancy hooks for Conduction apps consuming the [OpenRegister `MultiTenancyTrait`](https://github.com/ConductionNL/nextcloud-vue/blob/main/openspec/specs/store/spec.md). One shared `activeOrganisationUuid` flows top-to-bottom via Vue provide/inject; every outbound request, every `<CnFormDialog>` instance, and every store action picks up the active tenant automatically.

Spec: `openspec/changes/multi-tenancy-context`.

## When to use

- An app where users belong to multiple organisations and the active organisation must scope CRUD reads/writes server-side via the `X-OpenRegister-Organisation` header.
- An app that already declares an `organisation` field on its schemas and wants the form dialogs to auto-stamp the active tenant.

If your deployment is single-tenant you can skip this entirely — `CnAppRoot` mounts the provider unconditionally, but it stays inactive until something calls `setActiveTenant()`.

## Wiring at the app entry

`CnAppRoot` already calls `provideTenantContext()` for you. If you want to seed the initial tenant from server-rendered state pass `:initial-organisation-uuid` and `:initial-organisation`:

```vue
<template>
	<CnAppRoot
		:manifest="manifest"
		:initial-organisation-uuid="bootstrap.activeOrgUuid"
		:initial-organisation="bootstrap.activeOrg" />
</template>

<script>
import bootstrap from '@nextcloud/initial-state'
import manifest from './manifest.json'

export default {
	data() {
		return { manifest, bootstrap: bootstrap('myapp', 'tenancy') }
	},
}
</script>
```

If you bootstrap your shell without `CnAppRoot`, mount the provider yourself:

```js
// main.js
import { provideTenantContext } from '@conduction/nextcloud-vue'

const App = {
	setup() {
		provideTenantContext(seededUuid, seededOrg)
	},
	// ...
}
```

## Reading the context

### Composition API

```js
import { useTenantContext } from '@conduction/nextcloud-vue'

export default {
	setup() {
		const { activeOrganisationUuid, activeOrganisation, setActiveTenant, onTenantSwitch } = useTenantContext()

		// React to switches across the whole app
		const off = onTenantSwitch(({ uuid }) => {
			console.log('tenant switched to', uuid)
		})

		return { activeOrganisationUuid, activeOrganisation, setActiveTenant, off }
	},
}
```

### Options API

Use `tenantContextMixin` for the same surface:

```js
import { tenantContextMixin } from '@conduction/nextcloud-vue'

export default {
	mixins: [tenantContextMixin],

	created() {
		this.onTenantSwitch(({ uuid }) => {
			this.refreshList(uuid)
		})
	},

	methods: {
		switch(orgUuid) {
			this.setActiveTenant(orgUuid)
		},
	},
}
```

## What the provider stamps

When a tenant is active:

- Every `useObjectStore()` / `createObjectStore()` fetch stamps `X-OpenRegister-Organisation: <uuid>` (`buildHeaders({ organisationUuid })`).
- Every `createCrudStore()` action does the same.
- `CnIndexPage` watches its `:active-organisation` prop and forwards changes into the bound store via `setActiveTenantOrganisation(uuid)` so the next `fetchCollection()` hits the correct tenant.
- `CnFormDialog` and `CnAdvancedFormDialog` auto-fill the `organisation` field on create when the schema declares one and the form data is empty.
- `CnTenantBadge` renders the active organisation in the top-bar slot of `CnAppRoot`.

## Server-side validation

When `strict_organisation_header_validation` is opt-in on OR, mismatched `X-OpenRegister-Organisation` headers are rejected with a structured warning header `X-OpenRegister-Organisation-Mismatch: 1`. See the companion `multi-tenancy-header-validation` change in the OpenRegister openspec for the server contract.

## Single-tenant fallback

`useTenantContext()` outside a provider returns a noop fallback: `activeOrganisationUuid.value` is `null`, `setActiveTenant()` logs a console warning and writes to a local stand-alone context (so consumer code does not crash). The header stamping silently no-ops; the schema auto-fill silently no-ops. Single-tenant apps can leave the code paths in place without behavioural drift.
