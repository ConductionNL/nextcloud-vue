/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * useManifestEditHistory — thin Vue 2.7 reactive wrapper around the
 * Vue-free `createManifestEditHistory` core util.
 *
 * The core util's `canUndo`/`canRedo`/`current`/`size` are plain getters —
 * they cannot be made reactive by wrapping them in `computed()`, since Vue's
 * reactivity system has no way to know a plain getter changed. This
 * composable holds its own `ref`s for those four reads and refreshes them
 * after every mutating call (`push`/`undo`/`redo`/`clear`), so a template
 * can bind `v-if="canUndo"` / `@click="undo"` directly.
 *
 * Contains no history logic of its own beyond that ref mirroring — every
 * semantic (bounded stack, branch discard, coalescing, clone/freeze) lives
 * in `createManifestEditHistory`.
 *
 * @module composables/useManifestEditHistory
 */

import { ref } from 'vue'
import { createManifestEditHistory } from '../utils/manifestEditHistory.js'

/**
 * Create a reactive Vue 2.7 wrapper over a manifest edit history.
 *
 * @param {object} [options] Forwarded verbatim to `createManifestEditHistory`.
 * @param {number} [options.limit] Maximum number of stored snapshots (default `100`).
 * @param {number} [options.coalesceMs] Coalescing window in ms (default `0`, disabled).
 * @param {Function} [options.now] Injectable clock (default `Date.now`).
 * @return {{
 *   push: (state: object, label?: string) => (object|null),
 *   undo: () => (object|null),
 *   redo: () => (object|null),
 *   clear: () => void,
 *   canUndo: import('vue').Ref<boolean>,
 *   canRedo: import('vue').Ref<boolean>,
 *   size: import('vue').Ref<number>,
 *   current: import('vue').Ref<object|null>,
 * }} The reactive history handle.
 *
 * @example
 *   import { useManifestEditHistory } from '@conduction/nextcloud-vue'
 *   export default {
 *     setup() {
 *       const history = useManifestEditHistory({ coalesceMs: 500 })
 *       return { history }
 *     },
 *   }
 */
export function useManifestEditHistory(options) {
	const core = createManifestEditHistory(options)

	const canUndo = ref(core.canUndo)
	const canRedo = ref(core.canRedo)
	const size = ref(core.size)
	const current = ref(core.current)

	/** Mirror the core's plain getters into the reactive refs. */
	function sync() {
		canUndo.value = core.canUndo
		canRedo.value = core.canRedo
		size.value = core.size
		current.value = core.current
	}

	/**
	 * @param {object} state Manifest-shaped state to record.
	 * @param {string} [label] Optional coalescing label.
	 * @return {object|null} The new current snapshot, or `null` on a no-op push.
	 */
	function push(state, label) {
		const result = core.push(state, label)
		sync()
		return result
	}

	/** @return {object|null} The new current snapshot, or `null` at the bottom. */
	function undo() {
		const result = core.undo()
		sync()
		return result
	}

	/** @return {object|null} The new current snapshot, or `null` at the top. */
	function redo() {
		const result = core.redo()
		sync()
		return result
	}

	/** Empty the history and reset the reactive refs. */
	function clear() {
		core.clear()
		sync()
	}

	return { push, undo, redo, clear, canUndo, canRedo, size, current }
}
