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
| `switchSource` | `object \| null` | `null` | Makes the badge a switcher: `{ url, itemsPath, activePath, idField, labelTemplate }`. See [Switcher](#switcher). |
| `switchUrl` | `string` | `''` | `POST` target of a switch. |
| `switchParam` | `string` | `'id'` | Body key the chosen id is posted under. |
| `reloadAfterSwitch` | `boolean` | `false` | Reload the page after a switch, so every view reads the new scope. |

## Events

| Event | Payload | When |
|-------|---------|------|
| `switched` | `id` | A switch was accepted by `switchUrl`. |

## Switcher

With `switchSource` the badge lists the scopes the user may work in (administrations, organisations, workspaces) and switches between them. It is the header's one place to choose the scope.

- `GET switchSource.url` answers the scopes at `itemsPath` and the active id at `activePath` (dot paths).
- `idField` (default `id`) names each scope's id. `labelTemplate` is one template or a list of candidates with `{field}` tokens; the first that fills is the label, else the id.
- Choosing a scope posts `{ [switchParam]: id }` to `switchUrl`. A refused switch shows an alert and keeps the active scope.
- It hides with one scope or none, and when the source cannot be read.

```vue
<CnAppRoot :manifest="manifest">
	<template #tenant-badge>
		<CnTenantBadge
			:switch-source="{
				url: '/apps/books/api/administrations/context',
				itemsPath: 'administrations',
				activePath: 'activeAdministrationId',
				idField: 'administrationId',
				labelTemplate: ['{administrationCode} · {name}', '{name}'],
			}"
			switch-url="/apps/books/api/administrations/switch"
			switch-param="administrationId"
			reload-after-switch />
	</template>
</CnAppRoot>
```

The menu is an `NcActions` with a visible name (the active scope), so it is reachable by keyboard and its button names the active scope to a screen reader.

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
