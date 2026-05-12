/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * useAiContext — Inject the reactive cnAiContext provided by CnAppRoot.
 *
 * When called outside a CnAppRoot ancestor (e.g. in a Vitest mount without
 * the root wrapper), returns a safe default object so consumers do not crash.
 *
 * The returned object is the SAME reactive reference that CnAppRoot provides —
 * not a snapshot — so reactive watchers on individual fields fire when page
 * components overwrite fields.
 *
 * @returns {object} Reactive CnAiContext object
 */

import Vue from 'vue'

/**
 * Default context used when no CnAppRoot ancestor is present.
 * Created once at module level so the reference is stable across calls
 * in environments without a provider.
 */
const defaultContext = Vue.observable({
	appId: 'unknown',
	pageKind: 'custom',
	route: { path: '' },
})

/**
 * Symbol used as the Vue 2 provide/inject key for the AI context.
 * Must match the key used in CnAppRoot's provide() function.
 */
const CN_AI_CONTEXT_KEY = 'cnAiContext'

/**
 * Returns the reactive cnAiContext injected from the nearest CnAppRoot ancestor.
 * Falls back to a default object when no provider is present.
 *
 * This composable follows the Vue 2 factory pattern (not Vue 3 Composition API)
 * and must be called from a component's created() / setup() / data() context
 * where Vue's inject() is available.
 *
 * @example
 * // In a Vue 2 Options API component:
 * export default {
 *   inject: {
 *     cnAiContext: { from: 'cnAiContext', default: null }
 *   },
 *   created() {
 *     const ctx = useAiContext.call(this)
 *     // ctx.pageKind, ctx.objectUuid, etc.
 *   }
 * }
 *
 * @example
 * // In a composable / utility used from a component with inject:
 * import { useAiContext } from './useAiContext.js'
 * // Call with the component instance to get the injected context:
 * const ctx = useAiContext(instance)
 *
 * @param {object|null} [instance] Vue component instance (provides access to injected values).
 *   When null/undefined, the module-level default is returned.
 * @returns {object} Reactive CnAiContext
 */
export function useAiContext(instance) {
	if (instance && instance[CN_AI_CONTEXT_KEY] !== undefined) {
		return instance[CN_AI_CONTEXT_KEY]
	}
	// No provider found — return the stable default
	return defaultContext
}

export { CN_AI_CONTEXT_KEY, defaultContext }
