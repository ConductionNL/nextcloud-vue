/**
 * tenantContextMixin — Options-API parity layer for `useTenantContext`.
 *
 * Lets Options-only components consume the same shared tenant context the
 * Composition-API composable exposes. The mixin INJECTS the same
 * `TENANT_CONTEXT_KEY` provided by `provideTenantContext()` (typically
 * mounted in `App.vue` or `CnAppRoot`).
 *
 * Exposed on `this`:
 *   - `this.activeOrganisationUuid` — computed, reactive (string|null)
 *   - `this.activeOrganisation`     — computed, reactive (object|null)
 *   - `this.setActiveTenant(uuid)`  — method, mirrors the composable
 *   - `this.onTenantSwitch(cb)`     — method returning the unsubscribe
 *
 * When no provider is found the mixin falls back to a one-shot
 * stand-alone context (same fallback the composable yields), so a
 * single-tenant app never crashes.
 */

import { TENANT_CONTEXT_KEY, createTenantContext } from '../composables/useTenantContext.js'

let _fallbackContext = null

/**
 * Lazy stand-alone fallback context shared across all Options-API
 * consumers in a no-provider tree. One per page-load is enough — the
 * fallback's setActiveTenant warns and writes locally.
 *
 * @return {object} Tenant context
 */
function getFallbackContext() {
	if (!_fallbackContext) _fallbackContext = createTenantContext(null, null)
	return _fallbackContext
}

export const tenantContextMixin = {
	inject: {
		_cnTenantContext: {
			from: TENANT_CONTEXT_KEY,
			default: null,
		},
	},

	computed: {
		/**
		 * Resolved tenant context — injected if a provider mounted it,
		 * else the shared stand-alone fallback.
		 *
		 * @return {object}
		 */
		_resolvedTenantContext() {
			return this._cnTenantContext || getFallbackContext()
		},

		/**
		 * Active organisation UUID.
		 *
		 * @return {string|null}
		 */
		activeOrganisationUuid() {
			return this._resolvedTenantContext.activeOrganisationUuid.value
		},

		/**
		 * Resolved organisation entity (when provider has it).
		 *
		 * @return {object|null}
		 */
		activeOrganisation() {
			return this._resolvedTenantContext.activeOrganisation.value
		},
	},

	methods: {
		/**
		 * Switch the active tenant. Mirrors the composable's signature.
		 *
		 * @param {string|object|null} uuidOrPayload Tenant UUID or payload object
		 * @param {object} [organisation] Full org entity when calling with (uuid, org)
		 */
		setActiveTenant(uuidOrPayload, organisation) {
			return this._resolvedTenantContext.setActiveTenant(uuidOrPayload, organisation)
		},

		/**
		 * Subscribe to tenant-switch events.
		 *
		 * @param {Function} cb Callback receiving `{ previousUuid, uuid, organisation }`
		 * @return {Function} Unsubscribe handle
		 */
		onTenantSwitch(cb) {
			return this._resolvedTenantContext.onTenantSwitch(cb)
		},
	},
}

export default tenantContextMixin
