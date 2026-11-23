/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Signals the walkthrough listens for.
 *
 * A step with `advanceOn: { type: 'object-created', register, schema }`
 * advances when a `cn-walkthrough:object-created` window event arrives for
 * that register and schema. Every create path in the library calls
 * {@link dispatchObjectCreated}: the object store's save, the index page's
 * create override, and the related list's create form.
 *
 * @module utils/walkthroughSignals
 */

export const OBJECT_CREATED_EVENT = 'cn-walkthrough:object-created'

/**
 * Ids announced in the last few seconds. One save can pass through two
 * layers (a page's create override that itself calls the store), and one
 * create must advance a tour by one step, not two.
 *
 * @type {Map<string, number>}
 */
const recent = new Map()
const DEDUPE_MS = 2000

/**
 * The id of an OpenRegister object, whatever shape the response has.
 *
 * @param {object} object The created object.
 * @return {string} The id, or ''.
 */
function idOf(object) {
	if (!object || typeof object !== 'object') {
		return ''
	}
	const self = object['@self'] || {}
	return String(object.id || object.uuid || self.id || self.uuid || '')
}

/**
 * Announce that an object was created.
 *
 * `register` and `schema` are the slugs the creating surface knows. An
 * object's own `@self.register` / `@self.schema` are numeric ids on
 * OpenRegister, which a manifest's `advanceOn` never uses.
 *
 * @spec openspec/changes/walkthrough-advance-pause-resume/specs/cn-walkthrough/spec.md
 * @param {object} payload What was created.
 * @param {string|number} [payload.register] The register slug (or id).
 * @param {string|number} [payload.schema] The schema slug (or id).
 * @param {object} payload.object The created object.
 * @return {boolean} True when the event was dispatched (false for a duplicate or no window).
 */
export function dispatchObjectCreated({ register, schema, object } = {}) {
	if (typeof window === 'undefined' || !object || typeof object !== 'object') {
		return false
	}
	const id = idOf(object)
	const now = Date.now()
	for (const [key, at] of recent) {
		if (now - at > DEDUPE_MS) {
			recent.delete(key)
		}
	}
	if (id) {
		if (recent.has(id)) {
			return false
		}
		recent.set(id, now)
	}
	const detail = {
		...object,
		register: register !== undefined && register !== null && register !== '' ? register : object.register,
		schema: schema !== undefined && schema !== null && schema !== '' ? schema : object.schema,
		object,
	}
	try {
		window.dispatchEvent(new CustomEvent(OBJECT_CREATED_EVENT, { detail }))
	} catch {
		return false
	}
	return true
}

/**
 * Test-only: forget the recently announced ids.
 *
 * @internal
 */
export function __resetObjectCreatedDedupeForTests() {
	recent.clear()
}
