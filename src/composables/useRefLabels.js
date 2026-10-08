/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * useRefLabels — resolve the ids of a reference column to a label field of
 * the referenced objects, one batched request per schema.
 *
 * @spec openspec/changes/index-ref-column-labels/tasks.md#task-1
 */
import { useObjectStore } from '../store/useObjectStore.js'
import { resolveObjectOpType } from '../utils/actionsDispatcher.js'

/**
 * Read a dotted path (`person.displayName`) from an object.
 *
 * @param {object} obj  The object.
 * @param {string} path Dotted path.
 * @return {*} The value, or undefined.
 */
function readPath(obj, path) {
	return String(path).split('.').reduce((cur, k) => (cur !== null && cur !== undefined && typeof cur === 'object' ? cur[k] : undefined), obj)
}

/**
 * Turn a field value into display text. A per-language map collapses to its first value.
 *
 * @param {*} raw The field value.
 * @return {string} Text, or '' when unusable.
 */
function asText(raw) {
	if (typeof raw === 'string') {
		return raw.trim()
	}
	if (typeof raw === 'number') {
		return String(raw)
	}
	if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
		const first = Object.values(raw).find((v) => typeof v === 'string' && v.trim() !== '')
		return first ? first.trim() : ''
	}
	return ''
}

/**
 * Pick the label off a referenced object: `labelField` first, then `title`,
 * `name` and `@self.name`.
 *
 * @param {object|null} obj        The referenced object.
 * @param {string}      labelField Preferred (possibly nested) property.
 * @return {string|null} The label, or null when none is usable.
 */
export function pickRefLabel(obj, labelField) {
	if (!obj || typeof obj !== 'object') {
		return null
	}
	for (const path of [labelField, 'title', 'name', '@self.name']) {
		if (!path) {
			continue
		}
		const text = asText(path.includes('.') ? readPath(obj, path) : obj[path])
		if (text !== '') {
			return text
		}
	}
	return null
}

/**
 * Create a resolver bound to an object store. Labels are cached per register,
 * schema and label field for the lifetime of the resolver.
 *
 * @param {Function} getStore Returns the object store, or null when none is available.
 * @return {{resolve: Function, invalidate: Function}}
 */
export function createRefLabelResolver(getStore) {
	const cache = new Map()

	const bucket = (key) => {
		if (!cache.has(key)) {
			cache.set(key, new Map())
		}
		return cache.get(key)
	}

	return {
		/**
		 * Resolve ids to labels. One request per call for the ids not yet cached.
		 * An id that cannot be resolved maps to null; this never throws.
		 *
		 * @param {string}   register   Register slug of the referenced schema.
		 * @param {string}   schema     Schema slug of the referenced objects.
		 * @param {string[]} ids        Ids to resolve (duplicates are dropped).
		 * @param {string}   labelField Property holding the label (dotted paths allowed).
		 * @return {Promise<Object<string, string|null>>} Label by id.
		 */
		async resolve(register, schema, ids, labelField) {
			const distinct = [...new Set((ids || []).filter((id) => id !== null && id !== undefined && id !== '').map(String))]
			const out = {}
			if (distinct.length === 0) {
				return out
			}
			const store = typeof getStore === 'function' ? getStore() : null
			if (!store || !register || !schema) {
				distinct.forEach((id) => {
					out[id] = null
				})
				return out
			}
			let type
			try {
				type = resolveObjectOpType(store, { register, schema }, { exactSchema: true })
			} catch {
				distinct.forEach((id) => {
					out[id] = null
				})
				return out
			}
			const hit = bucket(`${type}::${labelField || ''}`)
			const missing = []
			for (const id of distinct) {
				const stored = store.objects && store.objects[type] && store.objects[type][id]
				if (hit.has(id)) {
					continue
				}
				const label = stored ? pickRefLabel(stored, labelField) : null
				if (label !== null) {
					hit.set(id, label)
				} else {
					missing.push(id)
				}
			}
			if (missing.length > 0) {
				let rows
				try {
					const top = labelField ? String(labelField).split('.')[0] : 'name'
					rows = await store.fetchCollectionForOptions(type, {
						_ids: missing.join(','),
						_limit: missing.length,
						_fields: [...new Set([top, 'title', 'name'])].join(','),
					})
				} catch {
					rows = []
				}
				const byId = new Map()
				;(Array.isArray(rows) ? rows : []).forEach((row) => {
					const id = row && (row.id ?? row.uuid ?? (row['@self'] && row['@self'].id))
					if (id !== undefined && id !== null) {
						byId.set(String(id), row)
					}
				})
				missing.forEach((id) => hit.set(id, pickRefLabel(byId.get(id), labelField)))
			}
			distinct.forEach((id) => {
				out[id] = hit.has(id) ? hit.get(id) : null
			})
			return out
		},

		/**
		 * Forget cached labels, all of them or those of one register and schema.
		 * Call after a write to a referenced object.
		 *
		 * @param {string} [register] Register slug.
		 * @param {string} [schema]   Schema slug.
		 */
		invalidate(register, schema) {
			if (!register) {
				cache.clear()
				return
			}
			for (const key of [...cache.keys()]) {
				if (key.includes(register) && (!schema || key.includes(schema))) {
					cache.delete(key)
				}
			}
		},
	}
}

/**
 * Composable form of the resolver, bound to the shared object store.
 *
 * @return {{resolve: Function, invalidate: Function}} The resolver.
 */
export function useRefLabels() {
	return createRefLabelResolver(() => {
		try {
			return useObjectStore()
		} catch {
			return null
		}
	})
}
