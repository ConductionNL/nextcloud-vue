/**
 * useIntegrationRegistry — reactive Vue 2.7 composable wrapping the
 * pluggable integration registry singleton.
 *
 * Components import `useIntegrationRegistry()` and get back a
 * `ComputedRef` of the current integration list plus helper accessors.
 * The list re-evaluates whenever an app registers or unregisters a
 * provider, so `CnObjectSidebar`, `CnDashboardPage`, and `CnDetailPage`
 * naturally re-render after late registration.
 *
 * For lib-owned integration ids (every entry in `builtinIntegrations`),
 * `resolveTab` / `resolveWidget` resolve the component locally — from
 * `LIB_INTEGRATION_COMPONENTS`, imported by THIS module in the
 * rendering bundle — rather than from the shared registry's stored
 * component object. This sidesteps the dual-Vue-runtime trap of
 * ADR-019 (registering bundle ≠ rendering bundle → composition-API
 * `inject()` returns undefined → `NcButton`'s `useNcFormBox`
 * destructure throws). Custom consumer ids continue to resolve via
 * the shared registry's stored object — those live in the consumer's
 * own bundle and render under the same Vue, so no mismatch arises.
 *
 * @example
 * import { useIntegrationRegistry } from '@conduction/nextcloud-vue'
 *
 * export default {
 *   setup() {
 *     const { integrations, getById, resolveTab, resolveWidget } = useIntegrationRegistry()
 *     return { integrations, getById, resolveTab, resolveWidget }
 *   },
 * }
 *
 * @see openregister#1958
 */

import { onBeforeUnmount, shallowRef, computed } from 'vue'
import { integrations as defaultRegistry, sharedRegistryIfInstalled } from '../integrations/registry.js'
import { LIB_INTEGRATION_COMPONENTS } from '../integrations/libComponents.js'

/**
 * Subscribe to the integration registry and expose a reactive
 * snapshot plus helpers.
 *
 * @param {object} [registry] Override registry instance (used in tests).
 *
 * @return {{
 *   integrations: import('vue').ComputedRef<object[]>,
 *   getById: (id: string) => ?object,
 *   resolveTab: (id: string) => ?object,
 *   resolveWidget: (id: string, surface: string) => ?object,
 *   registry: object,
 * }}
 */
export function useIntegrationRegistry(registry) {
	// Prefer the shared registry installed on the global by OpenRegister's
	// bootstrap (so a consuming app reads the SAME registry every leaf —
	// generic or Path-2 — registered into, regardless of which bundle
	// owns it). Falls back to this bundle's module singleton when no
	// global is installed (standalone use, unit tests).
	const target = registry || sharedRegistryIfInstalled() || defaultRegistry
	// shallowRef, not ref: the snapshot holds integration descriptors
	// whose `tab` / `widget` / `widget*` fields are Vue component
	// options objects. Deep reactive observation would walk into those
	// component objects and tag them with `__ob__`, which breaks
	// `<component :is="...">` resolution. We only need top-level
	// reactivity — replacing `.value` on each registry change.
	const snapshot = shallowRef(target.list())

	const unsubscribe = target.onChange((next) => {
		snapshot.value = next
	})

	onBeforeUnmount(() => {
		unsubscribe()
	})

	/**
	 * Resolve the sidebar tab component for an integration id, preferring
	 * the LOCAL lib-owned component (rendering-bundle Vue) over the
	 * shared registry's stored object (potentially cross-bundle).
	 *
	 * @param {string} id Integration id.
	 *
	 * @return {?object} Vue component, or null when unknown.
	 */
	function resolveTab(id) {
		const entry = target.get(id)
		// Lib-owned entries: swap to the rendering-bundle's local
		// component (LIB_INTEGRATION_COMPONENTS imported by THIS module)
		// to avoid the ADR-019 cross-Vue trap. Consumer-custom entries
		// keep their stored component — they live in the consumer's own
		// bundle, so no mismatch arises.
		if (entry && entry.__libOwned === true) {
			const libEntry = LIB_INTEGRATION_COMPONENTS[id]
			if (libEntry && libEntry.tab) {
				return libEntry.tab
			}
		}
		return entry && entry.tab ? entry.tab : null
	}

	/**
	 * Resolve the widget component for an integration id and surface,
	 * preferring the LOCAL lib-owned component over the shared registry.
	 * Applies the same AD-19 surface fallback as `registry.resolveWidget`.
	 *
	 * @param {string} id Integration id.
	 * @param {string} surface Surface name.
	 *
	 * @return {?object} Vue component, or null when unknown.
	 */
	function resolveWidget(id, surface) {
		const entry = target.get(id)
		// Lib-owned: swap to the local component for this surface (with
		// the AD-19 fallback to `widget`). Consumer-custom entries fall
		// through to the shared registry's resolveWidget — same-bundle,
		// no mismatch. See openregister#1958.
		if (entry && entry.__libOwned === true) {
			const libEntry = LIB_INTEGRATION_COMPONENTS[id]
			if (libEntry) {
				if (surface === 'user-dashboard' && libEntry.widgetCompact) {
					return libEntry.widgetCompact
				}
				if (surface === 'detail-page' && libEntry.widgetExpanded) {
					return libEntry.widgetExpanded
				}
				if (surface === 'single-entity' && libEntry.widgetEntity) {
					return libEntry.widgetEntity
				}
				if (libEntry.widget) {
					return libEntry.widget
				}
			}
		}
		return target.resolveWidget(id, surface)
	}

	return {
		integrations: computed(() => snapshot.value),
		getById: (id) => target.get(id),
		resolveTab,
		resolveWidget,
		registry: target,
	}
}
