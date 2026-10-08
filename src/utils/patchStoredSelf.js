/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Write a server answer (`favourite`, `watching`, ...) into the `@self` of an
 * object the object store already holds, so a list showing the same object
 * agrees with the toggle that changed it.
 *
 * @spec openspec/changes/record-favourite-and-follow/tasks.md#task-1
 */
import { useObjectStore } from '../store/useObjectStore.js'

/**
 * Merge a patch into the stored object's `@self`. Does nothing when the store
 * does not hold the object; it never registers a type or fetches.
 *
 * @param {string} register Register slug.
 * @param {string} schema   Schema slug.
 * @param {string} id       Object id.
 * @param {object} patch    Keys to merge into `@self`.
 * @return {boolean} True when a stored object was updated.
 */
export function patchStoredSelf(register, schema, id, patch) {
	let store
	try {
		store = useObjectStore()
	} catch {
		return false
	}
	const registry = (store && store.objectTypeRegistry) || {}
	const type = Object.keys(registry).find((slug) => {
		const config = registry[slug]
		return config && ((String(config.register) === String(register) && String(config.schema) === String(schema))
			|| (config.registerSlug === register && config.schemaSlug === schema))
	})
	const stored = type && store.objects && store.objects[type] && store.objects[type][id]
	if (!stored) {
		return false
	}
	store.objects = {
		...store.objects,
		[type]: { ...store.objects[type], [id]: { ...stored, '@self': { ...(stored['@self'] || {}), ...patch } } },
	}
	return true
}
