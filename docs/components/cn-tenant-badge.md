# CnTenantBadge

Compact badge that renders the active organisation's name (and optional letter icon) for multi-tenant Conduction apps. Wires to [`useTenantContext`](../utilities/composables/use-tenant-context.md) so it stays reactive on `setActiveTenant()` calls.

Spec: `openspec/changes/multi-tenancy-context` — REQ-MT-4.

## When to use

- A multi-tenant app where the user belongs to more than one organisation and you want a always-visible cue of which tenant CRUD operations target.
- A top-bar slot of [`CnAppRoot`](./cn-app-root.md) (`#tenant-badge`); the badge is also valid as a stand-alone element in any layout.

The badge auto-hides when the user has at most one organisation, so single-tenant deployments can mount it unconditionally.

## Usage

```vue
<template>
	<CnAppRoot :manifest="manifest" :user-organisations="orgs">
		<template #tenant-badge>
			<CnTenantBadge :organisations="orgs" />
		</template>
	</CnAppRoot>
</template>

<script>
import { CnAppRoot, CnTenantBadge } from '@conduction/nextcloud-vue'
import manifest from './manifest.json'

export default {
	components: { CnAppRoot, CnTenantBadge },
	data() {
		return { manifest, orgs: window.OCP?.initialState?.['myapp-orgs'] || [] }
	},
}
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `organisations` | `Array \| null` | `null` | Full list of organisations the current user belongs to. When supplied, the badge hides if `organisations.length <= 1`. When `null` (length unknown), the badge renders whenever an active organisation exists. |
| `size` | `'sm' \| 'md'` | `'sm'` | Visual size. `'sm'` is intended for the top-bar slot; `'md'` is a larger variant for dashboard headers. |
| `fallbackName` | `string` | `''` | Name shown when only the active UUID is known and the full organisation entity has not yet been resolved. |

## Reactive context

`CnTenantBadge` reads from `useTenantContext()` via the `tenantContextMixin`. It re-renders whenever `setActiveTenant()` fires the `tenantSwitch` event — switching tenants updates the name and icon in place without remounting.

## Auto-hide rules

- `organisations` is a non-null array of length `<= 1` → hide.
- No active organisation UUID AND no `fallbackName` → hide.
- Otherwise render.

## Accessibility

The badge sets `title="<organisation name>"` on its wrapper for screen-reader hover affordance. The text is rendered with the same colour contrast as the surrounding `--color-main-text` token so it inherits theme + dark-mode styling.

## Related

- [`useTenantContext`](../utilities/composables/use-tenant-context.md) — composable backing the badge.
- [`provideTenantContext`](../utilities/provide-tenant-context.md) — mounts the provider that the badge reads from.
- [Multi-tenancy guide](../multi-tenancy.md) — end-to-end wiring across `CnAppRoot`, `CnFormDialog`, and store actions.
