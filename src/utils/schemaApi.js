/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The OpenRegister **schema API contract**, in one place.
 *
 * Why this module exists: `CnSchemaFormDialog` is shared by every app that edits
 * schemas (Buildiq, OpenRegister, …), but it only ever emits `@confirm(payload)` —
 * each consumer then wrote its OWN persistence. So the *presentation* was shared
 * while the *contract* (what a 409 means, when to acknowledge, how to cascade a
 * delete) was reimplemented per app and free to drift. It did: the same
 * breaking-change bug had to be found and fixed twice, and OpenRegister's own editor
 * still could not save a breaking change at all.
 *
 * Anything that talks to `/apps/openregister/api/schemas` should go through here, so
 * the two behaviours physically cannot diverge again.
 *
 * The two refusals the server can raise are surfaced as typed errors rather than raw
 * axios failures, because both are *questions for the user*, not faults:
 *
 *  - {@link SchemaBreakingChangeError} — the edit changes the data model (e.g. a
 *    property going `string` → `object` when it becomes a relation). Re-save with
 *    `acknowledgeBreaking: true` once the user has seen `.changes`.
 *  - {@link SchemaHasObjectsError} — the delete would orphan stored objects. Re-issue
 *    with `deleteObjects: true` to cascade, once the user has seen `.objectCount`.
 *
 * NEVER acknowledge or cascade on the user's behalf: call once without the flag, show
 * what the server objected to, and only then re-issue. The flags exist so a
 * destructive or lossy action is a decision, not a side effect.
 */

import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { parseAxiosError } from './errors.js'

/**
 * The server classified a schema edit as breaking and will not apply it until the
 * caller acknowledges that stored objects may no longer match the schema.
 *
 * @property {Array<object>} changes The `changes[]` the server objected to, each
 *   `{property, kind, old, new}` — show these to the user verbatim.
 */
export class SchemaBreakingChangeError extends Error {

	/**
	 * @param {Array<object>} changes The changes the server flagged.
	 */
	constructor(changes) {
		super('Schema change classified breaking; acknowledgeBreaking required.')
		this.name = 'SchemaBreakingChangeError'
		this.breaking = true
		this.changes = Array.isArray(changes) ? changes : []
	}

}

/**
 * The server refused to delete a schema because objects still use it.
 *
 * @property {number} objectCount How many objects would be orphaned.
 */
export class SchemaHasObjectsError extends Error {

	/**
	 * @param {number} objectCount The number of objects still attached.
	 */
	constructor(objectCount) {
		super('Schema still has objects.')
		this.name = 'SchemaHasObjectsError'
		this.objectCount = Number(objectCount) || 0
	}

}

/**
 * Unwrap an OpenRegister API payload (`{result}` / `{results}` / array / object).
 *
 * @param {object|Array} data The raw response body.
 * @return {*} The unwrapped payload.
 */
function unwrap(data) {
	if (!data) return data
	if (data.result !== undefined) return data.result
	if (data.results !== undefined) return data.results
	return data
}

/**
 * Create or update a schema.
 *
 * Throws {@link SchemaBreakingChangeError} when the server refuses the edit as
 * breaking and it was not acknowledged — catch it, show `.changes`, and call again
 * with `acknowledgeBreaking: true` if the user accepts.
 *
 * @param {object} schema The schema payload (from CnSchemaFormDialog's `@confirm`).
 * @param {object} [options] Options.
 * @param {number} [options.id] Schema id — PUT when set, POST (create) when not.
 * @param {boolean} [options.acknowledgeBreaking] Accept a breaking change. Never
 *   pass this on the first attempt: let the server object first.
 * @param {object} [options.headers] Request headers.
 * @return {Promise<object>} The saved schema.
 * @throws {SchemaBreakingChangeError} When the change is breaking and unacknowledged.
 */
export async function saveSchema(schema, options = {}) {
	const { id, acknowledgeBreaking = false, headers = {} } = options
	try {
		if (id) {
			const url = generateUrl(`/apps/openregister/api/schemas/${id}`)
				+ (acknowledgeBreaking ? '?acknowledgeBreaking=true' : '')
			const res = await axios.put(url, schema, { headers })
			return unwrap(res && res.data)
		}
		const res = await axios.post(
			generateUrl('/apps/openregister/api/schemas'),
			schema,
			{ headers },
		)
		return unwrap(res && res.data)
	} catch (e) {
		const { status, data } = parseAxiosError(e)
		// Only translate the refusal when it was NOT already acknowledged — otherwise
		// the caller would re-prompt forever against a server that keeps refusing.
		if (status === 409 && data && data.classification === 'breaking' && !acknowledgeBreaking) {
			throw new SchemaBreakingChangeError(data.changes)
		}
		throw e
	}
}

/**
 * Delete a schema.
 *
 * Throws {@link SchemaHasObjectsError} when objects still use the schema and the
 * cascade was not requested — catch it, show `.objectCount`, and call again with
 * `deleteObjects: true` if the user accepts losing that data.
 *
 * @param {number} id The schema id.
 * @param {object} [options] Options.
 * @param {boolean} [options.deleteObjects] Also delete the objects (irreversible).
 * @param {object} [options.headers] Request headers.
 * @return {Promise<object>} The delete result (`{deletedCount, tableDropped, …}`).
 * @throws {SchemaHasObjectsError} When objects remain and the cascade was not asked for.
 */
export async function deleteSchema(id, options = {}) {
	const { deleteObjects = false, headers = {} } = options
	try {
		const url = generateUrl(`/apps/openregister/api/schemas/${id}`)
			+ (deleteObjects ? '?deleteObjects=true' : '')
		const res = await axios.delete(url, { headers })
		return unwrap(res && res.data)
	} catch (e) {
		const { status, code, data } = parseAxiosError(e)
		if (status === 409 && code === 'schema-has-objects' && !deleteObjects) {
			throw new SchemaHasObjectsError(data && data.objectCount)
		}
		throw e
	}
}

/**
 * Render one entry of a {@link SchemaBreakingChangeError}'s `changes[]` as a line a
 * human can read, e.g. `{property: 'barn', kind: 'type_changed', old: 'string', new:
 * 'object'}` → "barn: type changed (from string to object)".
 *
 * Lives here so both editors word the warning identically.
 *
 * @param {object} change One change descriptor from the server.
 * @param {Function} translate A `t`-style translator: `(app, text, vars) => string`.
 * @return {string} The description.
 */
export function describeSchemaChange(change, translate) {
	if (!change || typeof change !== 'object') return ''
	const t = typeof translate === 'function' ? translate : (app, text) => text

	const property = change.property || t('nextcloud-vue', 'schema')
	const kind = String(change.kind || '').replace(/_/g, ' ')
	const fmt = (v) => (v === null || v === undefined
		? t('nextcloud-vue', 'none')
		: (typeof v === 'object' ? JSON.stringify(v) : String(v)))

	if (change.old === undefined && change.new === undefined) {
		return `${property}: ${kind}`
	}
	return t('nextcloud-vue', '{property}: {kind} (from {old} to {new})', {
		property,
		kind,
		old: fmt(change.old),
		new: fmt(change.new),
	})
}
