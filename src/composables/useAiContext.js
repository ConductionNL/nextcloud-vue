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

import { reactive } from 'vue'

/**
 * Default context used when no CnAppRoot ancestor is present.
 * Created once at module level so the reference is stable across calls
 * in environments without a provider.
 */
const defaultContext = reactive({
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
	// ⚠️ `!= null` (loose) catches BOTH undefined and null, and the null case is
	// the one that mattered.
	//
	// Every consumer declares `inject: { cnAiContext: { default: null } }` — the
	// documented pattern, shown in this file's own example above. With no
	// provider on the page, Vue injects that default, so the value is NULL, not
	// undefined. A strict `!== undefined` check passed it straight through, and
	// the caller then read `ctx.appId` off null.
	//
	// It never surfaced inside a Conduction app, because CnAppRoot always
	// provides the context there. It surfaces the moment the companion is
	// mounted standalone on a page that is not ours — which is exactly what
	// Hermiq's always-on companion bundle does. Measured symptom, on the
	// Euro-Office editor: sending a message threw
	// `TypeError: Cannot read properties of null (reading 'appId')`
	// and the turn never left the browser.
	if (instance && instance[CN_AI_CONTEXT_KEY] != null) {
		return instance[CN_AI_CONTEXT_KEY]
	}

	// No provider, or a provider that injected the documented null default.
	return defaultContext
}

export { CN_AI_CONTEXT_KEY, defaultContext }
