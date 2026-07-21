/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * useCommandPalette — the public registration API for `CnCommandPalette`.
 *
 * ```js
 * import { useCommandPalette } from '@conduction/nextcloud-vue'
 *
 * export default {
 *   mounted() {
 *     this._cmdPalette = useCommandPalette()
 *     this._cmdPalette.register({
 *       id: 'my-app.create-invoice',
 *       title: 'Create invoice',
 *       section: 'Actions',
 *       keywords: ['new', 'factuur'],
 *       run: () => this.$router.push({ name: 'invoice-create' }),
 *     })
 *   },
 *   beforeDestroy() {
 *     this._cmdPalette.unregister('my-app.create-invoice')
 *   },
 * }
 * ```
 *
 * Follows the repo's Vue 2.7 / Options API composable convention (see
 * `useAiContext.js`, `useWidgetForm.js`): a plain factory function backed
 * by a `Vue.observable` module singleton, callable from `created()` /
 * `mounted()` / a method — NOT a Composition-API-only `setup()` hook like
 * `useIntegrationRegistry` (that one needs `onBeforeUnmount` because
 * integrations survive across many more component instances; commands are
 * typically registered/unregistered by the SAME component's own lifecycle
 * hooks, so the caller already has a natural unregister point).
 *
 * Two independent pieces of state, both shared app-wide by default so a
 * command registered by one component and an "Open command palette"
 * button rendered by another both operate on the SAME palette:
 *
 *  - `state.isOpen` — whether the palette is currently shown.
 *  - `commands` — the live, ranked-input-shaped command list.
 *
 * @module composables/useCommandPalette
 */

import Vue from 'vue'
import { commandPaletteRegistry } from '../commandPalette/registry.js'

/**
 * Shared open/close state. A module singleton (not per-call) so every
 * `useCommandPalette()` caller — the `CnCommandPalette` instance itself,
 * or an unrelated toolbar button elsewhere in the tree — toggles the SAME
 * palette.
 *
 * @type {{isOpen: boolean}}
 */
const paletteState = Vue.observable({ isOpen: false })

/**
 * Reactive snapshot of the DEFAULT registry's command list, kept in sync
 * by ONE `onChange` subscription established at module load. Every
 * `useCommandPalette()` call without an explicit `registry` override reads
 * this same live object instead of each maintaining its own subscription.
 *
 * @type {{items: object[]}}
 */
const defaultSnapshot = Vue.observable({ items: commandPaletteRegistry.list() })
commandPaletteRegistry.onChange((next) => {
	defaultSnapshot.items = next
})

/**
 * @param {object} [registry] Override registry (test isolation / a deliberately separate palette instance). Defaults to the shared `commandPaletteRegistry` singleton.
 * @return {{
 *   state: {isOpen: boolean},
 *   commands: {items: object[]},
 *   register: (entry: object) => object,
 *   unregister: (id: string) => boolean,
 *   open: () => void,
 *   close: () => void,
 *   toggle: () => void,
 *   registry: object,
 * }} The palette API.
 */
export function useCommandPalette(registry) {
	const isDefaultRegistry = !registry || registry === commandPaletteRegistry
	const target = registry || commandPaletteRegistry

	// Non-default registries (test isolation) get their own reactive
	// snapshot + subscription; the shared default path reuses the single
	// module-level snapshot/subscription above.
	const snapshot = isDefaultRegistry ? defaultSnapshot : Vue.observable({ items: target.list() })
	if (!isDefaultRegistry) {
		target.onChange((next) => {
			snapshot.items = next
		})
	}

	return {
		state: paletteState,
		commands: snapshot,
		/**
		 * @param {object} entry See `createCommandRegistry().register` for the full descriptor shape.
		 * @return {object} The normalised, stored entry.
		 */
		register: (entry) => target.register(entry),
		/**
		 * @param {string} id Command id.
		 * @return {boolean} True if a command was removed.
		 */
		unregister: (id) => target.unregister(id),
		/** @return {void} */
		open() {
			paletteState.isOpen = true
		},
		/** @return {void} */
		close() {
			paletteState.isOpen = false
		},
		/** @return {void} */
		toggle() {
			paletteState.isOpen = !paletteState.isOpen
		},
		registry: target,
	}
}

export { paletteState as commandPaletteOpenState }
