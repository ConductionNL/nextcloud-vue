/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The per-user interaction calls OpenRegister serves on a record: favourite,
 * watch (follow) and the watchers list. Plain functions over `fetch`, shared
 * by the interactions store plugin and by the toggles, so a toggle works with
 * or without the plugin installed.
 *
 * @spec openspec/changes/record-favourite-and-follow/tasks.md#task-1
 */
import { parseResponseError } from './errors.js'
import { buildHeaders, prefixUrl } from './headers.js'

const API = '/apps/openregister/api/objects'

/**
 * URL of a record's interaction endpoint.
 *
 * @param {string} register Register slug.
 * @param {string} schema   Schema slug.
 * @param {string} id       Object id.
 * @param {string} tail     Path after the object, e.g. `favourite`.
 * @return {string} The prefixed URL.
 */
export function interactionUrl(register, schema, id, tail) {
	const enc = (v) => encodeURIComponent(String(v))
	return prefixUrl(`${API}/${enc(register)}/${enc(schema)}/${enc(id)}/${tail}`)
}

/**
 * Send one interaction call and normalise the answer. Never throws.
 *
 * @param {string} method HTTP method.
 * @param {string} url    Full URL.
 * @return {Promise<{ok: boolean, status: number|null, data: (object|null), message: string}>} The outcome; `message` is the server's, or a network message.
 */
async function call(method, url) {
	try {
		const response = await fetch(prefixUrl(url), { method, headers: buildHeaders() })
		if (!response.ok) {
			const error = await parseResponseError(response, 'record')
			// The server's own words win over the generic status text.
			const detail = typeof error.details === 'string' ? error.details : ''
			return { ok: false, status: response.status, data: null, message: detail || String(error.message || '') }
		}
		let data = null
		if (response.status !== 204) {
			try {
				data = await response.json()
			} catch {
				data = null
			}
		}
		return { ok: true, status: response.status, data, message: '' }
	} catch (error) {
		return { ok: false, status: null, data: null, message: (error && error.message) || 'Network error' }
	}
}

/**
 * Star or unstar a record for the current user.
 *
 * @param {string}  register Register slug.
 * @param {string}  schema   Schema slug.
 * @param {string}  id       Object id.
 * @param {boolean} on       True to star, false to unstar.
 * @return {Promise<object>} The outcome (see `call`).
 */
export function setFavourite(register, schema, id, on) {
	return call(on ? 'PUT' : 'DELETE', interactionUrl(register, schema, id, 'favourite'))
}

/**
 * Follow or unfollow a record for the current user.
 *
 * @param {string}  register Register slug.
 * @param {string}  schema   Schema slug.
 * @param {string}  id       Object id.
 * @param {boolean} on       True to follow, false to unfollow.
 * @return {Promise<object>} The outcome (see `call`).
 */
export function setWatching(register, schema, id, on) {
	return call(on ? 'PUT' : 'DELETE', interactionUrl(register, schema, id, 'watch'))
}

/**
 * Mark a record read or unread for the current user.
 *
 * @param {string}  register Register slug.
 * @param {string}  schema   Schema slug.
 * @param {string}  id       Object id.
 * @param {boolean} read     True to mark read (`PUT`), false to mark unread (`DELETE`).
 * @return {Promise<object>} The outcome (see `call`).
 */
export function setReadState(register, schema, id, read) {
	return call(read ? 'PUT' : 'DELETE', interactionUrl(register, schema, id, 'read-state'))
}

/**
 * List the followers of a record (needs `update` on it).
 *
 * @param {string} register Register slug.
 * @param {string} schema   Schema slug.
 * @param {string} id       Object id.
 * @return {Promise<object>} The outcome; `data` is `{ results, total }`.
 */
export function listWatchers(register, schema, id) {
	return call('GET', interactionUrl(register, schema, id, 'watchers'))
}

/**
 * Add or remove one follower (needs `manage`; removing yourself is always allowed).
 *
 * @param {string}  register Register slug.
 * @param {string}  schema   Schema slug.
 * @param {string}  id       Object id.
 * @param {string}  userId   The colleague's user id.
 * @param {boolean} on       True to add, false to remove.
 * @return {Promise<object>} The outcome (see `call`).
 */
export function setWatcher(register, schema, id, userId, on) {
	return call(on ? 'PUT' : 'DELETE', interactionUrl(register, schema, id, `watchers/${encodeURIComponent(String(userId))}`))
}
