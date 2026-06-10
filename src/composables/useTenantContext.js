/**
 * useTenantContext — Vue 3 / Composition-API composable that exposes the
 * application-wide active organisation for a multi-tenant Conduction app.
 *
 * The contract (spec: multi-tenancy-context) is provider-based:
 *
 *   - `provideTenantContext(initialUuid?)` — call once high in the app
 *     tree (typically `App.vue` or `CnAppRoot`) to mount the shared
 *     refs + the `setActiveTenant` mutator. Returns the same shape
 *     consumers see from `useTenantContext()` so the provider can
 *     drive it directly.
 *   - `useTenantContext()` — call anywhere below the provider to read
 *     the reactive refs and the mutator. Returns a no-op fallback when
 *     no provider is present so consumer components do not crash on
 *     tenant-aware code paths in single-tenant apps.
 *
 * Both functions return:
 *   - `activeOrganisationUuid: Ref<string|null>`
 *   - `activeOrganisation:     Ref<Organisation|null>`
 *   - `setActiveTenant(uuidOrOrg, organisation?): void`
 *   - `onTenantSwitch(cb): () => void` — subscribe to `tenantSwitch`
 *     events; returns the unsubscribe handle.
 *   - `tenantSwitch: { on, off, emit }` — raw bus for low-level use.
 *
 * The composable is build-target-agnostic: it works under Vue 2.7
 * (`@vue/composition-api` shipped with vue@^2.7), Vue 3, and the
 * Options-API mixin in `src/mixins/tenantContext.js`.
 */

import { ref, inject, provide } from 'vue'

/** Injection key used by both `provideTenantContext` and `useTenantContext`. */
export const TENANT_CONTEXT_KEY = Symbol('cn:tenantContext')

/**
 * Minimal event bus matching the public API consumers reach for.
 *
 * @return {{ on: Function, off: Function, emit: Function }}
 */
function createBus() {
	const listeners = new Set()
	return {
		on(cb) {
			if (typeof cb === 'function') listeners.add(cb)
			return () => listeners.delete(cb)
		},
		off(cb) {
			listeners.delete(cb)
		},
		emit(payload) {
			for (const cb of listeners) {
				try {
					cb(payload)
				} catch (e) {
					// eslint-disable-next-line no-console
					console.error('[useTenantContext] tenantSwitch listener threw:', e)
				}
			}
		},
	}
}

/**
 * Build the shared context object. Called by `provideTenantContext`; also
 * useful for unit tests that want a stand-alone context without `provide()`.
 *
 * @param {string|null} [initialUuid] Initial organisation UUID
 * @param {object|null} [initialOrg] Initial organisation entity (optional)
 * @return {object} Shared tenant context
 */
export function createTenantContext(initialUuid = null, initialOrg = null) {
	const activeOrganisationUuid = ref(initialUuid)
	const activeOrganisation = ref(initialOrg)
	const tenantSwitch = createBus()

	/**
	 * Update the active tenant. Accepts either:
	 *   - `setActiveTenant(uuid)`  — UUID string only
	 *   - `setActiveTenant(uuid, organisation)` — UUID + full entity
	 *   - `setActiveTenant({ uuid, organisation? })` — object shape
	 *
	 * Emits `tenantSwitch` with `{ previousUuid, uuid, organisation }`
	 * only when the UUID actually changes.
	 *
	 * @param {string|object|null} uuidOrPayload Tenant UUID or payload object
	 * @param {object} [organisation] Full org entity when calling with (uuid, org)
	 */
	function setActiveTenant(uuidOrPayload, organisation) {
		let uuid = null
		let org = null

		if (uuidOrPayload && typeof uuidOrPayload === 'object') {
			uuid = uuidOrPayload.uuid ?? null
			org = uuidOrPayload.organisation ?? null
		} else {
			uuid = uuidOrPayload ?? null
			org = organisation ?? null
		}

		const previousUuid = activeOrganisationUuid.value
		if (previousUuid === uuid) {
			// Idempotent — refresh the resolved entity but skip emit
			if (org) activeOrganisation.value = org
			return
		}

		activeOrganisationUuid.value = uuid
		activeOrganisation.value = org

		tenantSwitch.emit({ previousUuid, uuid, organisation: org })
	}

	function onTenantSwitch(cb) {
		return tenantSwitch.on(cb)
	}

	return {
		activeOrganisationUuid,
		activeOrganisation,
		setActiveTenant,
		onTenantSwitch,
		tenantSwitch,
	}
}

/**
 * Provider — call once high in the component tree. Returns the same
 * shape consumers see so the provider can write to it directly.
 *
 * @param {string|null} [initialUuid] Initial organisation UUID
 * @param {object|null} [initialOrg] Initial organisation entity
 * @return {object} Tenant context (same shape as useTenantContext())
 */
export function provideTenantContext(initialUuid = null, initialOrg = null) {
	const ctx = createTenantContext(initialUuid, initialOrg)
	provide(TENANT_CONTEXT_KEY, ctx)
	return ctx
}

/**
 * Consumer — call from any component below the provider.
 *
 * Returns a no-op fallback when no provider is present so single-tenant
 * apps don't crash on tenant-aware code paths. The fallback's setter is
 * a noop that emits a console.warn; the refs are read-only null.
 *
 * @return {object} Tenant context
 */
export function useTenantContext() {
	const injected = inject(TENANT_CONTEXT_KEY, null)
	if (injected) return injected

	const fallback = createTenantContext(null, null)
	const realSetter = fallback.setActiveTenant
	fallback.setActiveTenant = function noopSetActiveTenant(...args) {
		// eslint-disable-next-line no-console
		console.warn(
			'[useTenantContext] No provider found in the component tree. '
			+ 'Call provideTenantContext() in App.vue / CnAppRoot before reading the context. '
			+ 'setActiveTenant() is a no-op until a provider is mounted.',
		)
		return realSetter(...args)
	}
	return fallback
}
