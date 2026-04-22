/**
 * Shared helpers for merging Pinia store plugins into a store definition.
 *
 * Used by both `createObjectStore` (via `useObjectStore.js`) and
 * `createCrudStore`, so plugin authors get the same shape everywhere:
 * `{ name, state?, getters?, actions? }`.
 */

/**
 * Merge plugin state factories into a single state object.
 *
 * @param {Array} plugins Array of plugin definitions
 * @return {object} Merged state object
 */
export function mergePluginState(plugins) {
	const merged = {}
	for (const plugin of plugins) {
		if (plugin.state) {
			Object.assign(merged, plugin.state())
		}
	}
	return merged
}

/**
 * Merge plugin getters into a single getters object.
 *
 * @param {Array} plugins Array of plugin definitions
 * @return {object} Merged getters object
 */
export function mergePluginGetters(plugins) {
	const merged = {}
	for (const plugin of plugins) {
		if (plugin.getters) {
			Object.assign(merged, plugin.getters)
		}
	}
	return merged
}

/**
 * Merge plugin actions into a single actions object.
 *
 * @param {Array} plugins Array of plugin definitions
 * @return {object} Merged actions object
 */
export function mergePluginActions(plugins) {
	const merged = {}
	for (const plugin of plugins) {
		if (plugin.actions) {
			Object.assign(merged, plugin.actions)
		}
	}
	return merged
}
