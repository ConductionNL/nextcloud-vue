/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An edit writes only the keys it changed. A form shows some of an object's
 * keys; writing the whole form back with PUT drops every key the form did
 * not show (a status's `capacity` saved from a form that has no such field).
 * So an edit of an existing object is a PATCH of the keys whose value
 * differs from the object as it was loaded, and an edit that changed nothing
 * writes nothing.
 *
 * @module utils/saveEdited
 * @spec openspec/changes/forms-save-edited-keys/specs/object-store/spec.md#requirement-an-edit-writes-only-the-keys-it-changed
 */

/** Keys that describe the object rather than hold its data; never written by an edit. */
const META_KEYS = new Set(['@self', 'id', 'uuid'])

/**
 * The keys of `after` whose value differs from `before`, with their new
 * values. Values compare by content, so an array or object that was rebuilt
 * but holds the same data is not a change. A key `after` leaves out is not a
 * change either: a form that does not show a key does not clear it.
 *
 * @param {object|null|undefined} before The object as it was loaded.
 * @param {object|null|undefined} after The edited values.
 * @return {object} The changed keys and their new values.
 */
export function changedKeys(before, after) {
	const was = before && typeof before === 'object' ? before : {}
	const now = after && typeof after === 'object' ? after : {}
	const out = {}
	for (const [key, value] of Object.entries(now)) {
		if (META_KEYS.has(key)) {
			continue
		}
		if (!sameValue(was[key], value)) {
			out[key] = value
		}
	}
	return out
}

/**
 * Whether two values hold the same data.
 *
 * @param {unknown} a One value.
 * @param {unknown} b The other.
 * @return {boolean} True when equal by content.
 */
function sameValue(a, b) {
	if (a === b) {
		return true
	}
	const blank = (v) => v === undefined || v === null
	if (blank(a) && blank(b)) {
		return true
	}
	if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
		return false
	}
	try {
		return JSON.stringify(a) === JSON.stringify(b)
	} catch {
		return false
	}
}

/**
 * The id of an OpenRegister object: its own `id`, else `@self.id`.
 *
 * @param {object|null|undefined} object The object.
 * @return {string} The id, or ''.
 */
export function objectIdOf(object) {
	if (!object || typeof object !== 'object') {
		return ''
	}
	const id = object.id ?? object['@self']?.id ?? object.uuid
	return id === undefined || id === null ? '' : String(id)
}

/**
 * Save an edit through an object store: a PATCH of the changed keys when the
 * object exists and the store can patch, the store's usual save otherwise (a
 * create, or a store without `patchObject`). An edit that changed nothing
 * resolves to the object as it was, without a request.
 *
 * @param {object} store An object store (`saveObject`, optionally `patchObject`).
 * @param {string} type The registered type slug.
 * @param {object|null} original The object as it was loaded, or null for a create.
 * @param {object} formData The edited values.
 * @return {Promise<object|null>} The saved object, or null on error.
 */
export async function saveEdited(store, type, original, formData) {
	const id = objectIdOf(original) || objectIdOf(formData)
	if (id === '' || !original || typeof store.patchObject !== 'function') {
		return store.saveObject(type, formData)
	}
	const changes = changedKeys(original, formData)
	if (Object.keys(changes).length === 0) {
		return original
	}
	return store.patchObject(type, id, changes)
}
