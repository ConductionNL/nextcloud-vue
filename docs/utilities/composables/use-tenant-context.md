# useTenantContext

Multi-tenancy composable for Conduction apps consuming the OpenRegister [`MultiTenancyTrait`](../../../openspec/specs/store/spec.md). One shared `activeOrganisationUuid` flows top-to-bottom via Vue provide/inject; every outbound request, every `<CnFormDialog>` instance, and every store action picks up the active tenant automatically.

Spec: `openspec/changes/multi-tenancy-context`.

## When to use

- An app where users belong to multiple organisations and the active organisation must scope CRUD reads/writes server-side via the `X-OpenRegister-Organisation` header.
- An app that already declares an `organisation` field on its schemas and wants the form dialogs to auto-stamp the active tenant on create.

Single-tenant deployments can leave the code paths in place — without a `setActiveTenant()` call the composable silently no-ops.

## Signature

```js
import { useTenantContext } from '@conduction/nextcloud-vue'

const {
	activeOrganisationUuid,   // Ref<string|null>
	activeOrganisation,        // Ref<object|null>
	setActiveTenant,           // (uuid: string | { uuid, organisation? }, organisation?) => void
	onTenantSwitch,            // (cb) => off()
} = useTenantContext()
```

## Return value

| Key | Type | Description |
|-----|------|-------------|
| `activeOrganisationUuid` | `Ref<string \| null>` | Current tenant UUID; `null` outside a provider or before the first `setActiveTenant()` call. |
| `activeOrganisation` | `Ref<object \| null>` | Resolved organisation entity. Lags `activeOrganisationUuid` when the consumer only knows the UUID. |
| `setActiveTenant` | `Function` | Update the tenant. Accepts `(uuid)`, `(uuid, organisation)`, or `({ uuid, organisation? })`. |
| `onTenantSwitch` | `Function` | Subscribe to `tenantSwitch` events. Returns an `off()` deregister handle. |

## Provider

Mount the provider at the top of the component tree. [`CnAppRoot`](../../components/cn-app-root.md) already does this for you — pass `:initial-organisation-uuid` and `:initial-organisation` to seed from server-rendered state:

```vue
<CnAppRoot
	:manifest="manifest"
	:initial-organisation-uuid="bootstrap.activeOrgUuid"
	:initial-organisation="bootstrap.activeOrg" />
```

Without `CnAppRoot`, call [`provideTenantContext`](../provide-tenant-context.md) yourself in your shell's `setup()`.

## Consuming the context

### Composition API

```js
import { useTenantContext } from '@conduction/nextcloud-vue'

export default {
	setup() {
		const { activeOrganisationUuid, setActiveTenant, onTenantSwitch } = useTenantContext()

		const off = onTenantSwitch(({ uuid }) => {
			// React to switches across the whole app
			console.log('tenant switched to', uuid)
		})

		return { activeOrganisationUuid, setActiveTenant, off }
	},
}
```

### Options API

```js
import { tenantContextMixin } from '@conduction/nextcloud-vue'

export default {
	mixins: [tenantContextMixin],

	created() {
		this.onTenantSwitch(({ uuid }) => this.refreshList(uuid))
	},

	methods: {
		switch(uuid) {
			this.setActiveTenant(uuid)
		},
	},
}
```

## What the provider stamps

When a tenant is active:

- Every `useObjectStore()` / `createObjectStore()` fetch stamps `X-OpenRegister-Organisation: <uuid>` (`buildHeaders({ organisationUuid })`).
- Every `createCrudStore()` action does the same.
- `CnIndexPage` watches `:active-organisation` and forwards changes via `setActiveTenantOrganisation(uuid)` so the next `fetchCollection()` hits the correct tenant.
- `CnFormDialog` and `CnAdvancedFormDialog` auto-fill the `organisation` field on create when the schema declares one and the form data is empty.
- `CnTenantBadge` renders the active organisation in the top-bar slot of `CnAppRoot`.

## Single-tenant fallback

`useTenantContext()` outside a provider returns a noop fallback: `activeOrganisationUuid.value` is `null`, `setActiveTenant()` logs a `console.warn` and writes to a stand-alone context (so consumer code doesn't crash). Header stamping silently no-ops; the schema auto-fill silently no-ops.

## Related

- [`provideTenantContext`](../provide-tenant-context.md) — installs the provider.
- [`createTenantContext`](../create-tenant-context.md) — builds a stand-alone context (mainly for tests).
- [`TENANT_CONTEXT_KEY`](../tenant-context-key.md) — injection key shared by provider and consumer.
- [`CnTenantBadge`](../../components/cn-tenant-badge.md) — top-bar badge backed by this composable.
- [Multi-tenancy guide](../../multi-tenancy.md) — end-to-end wiring across `CnAppRoot`, `CnFormDialog`, and store actions.
