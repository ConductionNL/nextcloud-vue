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
 * @example
 * import { useIntegrationRegistry } from '@conduction/nextcloud-vue'
 *
 * export default {
 *   setup() {
 *     const { integrations, getById, resolveWidget } = useIntegrationRegistry()
 *     return { integrations, getById, resolveWidget }
 *   },
 * }
 */

import { onBeforeUnmount, ref, computed } from 'vue'
import { integrations as defaultRegistry } from '../integrations/registry.js'

/**
 * Subscribe to the integration registry and expose a reactive
 * snapshot plus helpers.
 *
 * @param {object} [registry] Override registry instance (used in tests).
 *
 * @return {{
 *   integrations: import('vue').ComputedRef<object[]>,
 *   getById: (id: string) => ?object,
 *   resolveWidget: (id: string, surface: string) => ?object,
 *   registry: object,
 * }}
 */
export function useIntegrationRegistry(registry) {
	const target = registry || defaultRegistry
	const snapshot = ref(target.list())

	const unsubscribe = target.onChange((next) => {
		snapshot.value = next
	})

	onBeforeUnmount(() => {
		unsubscribe()
	})

	return {
		integrations: computed(() => snapshot.value),
		getById: (id) => target.get(id),
		resolveWidget: (id, surface) => target.resolveWidget(id, surface),
		registry: target,
	}
}
