/**
 * Nextcloud user autocomplete helpers.
 *
 * Resolves real Nextcloud users for the schema-driven form's user-picker
 * (a property marked `referenceType: 'nextcloud-user'` or `format: 'user'`).
 * Backed by the core autocomplete OCS endpoint, which is available to every
 * authenticated user (unlike the admin-only `cloud/users` provisioning API).
 *
 * Options are mapped to `{ id: <uid>, label: <display name> }` so the picker
 * stores the stable UID string while showing the human name.
 *
 * @module utils/userAutocomplete
 */

import axios from '@nextcloud/axios'
import { generateOcsUrl } from '@nextcloud/router'

/**
 * Map one autocomplete suggestion to a picker option, keeping only user
 * results. The OCS payload uses `id` for the UID, `label` for the display
 * name and `source` (`users`) / `shareType` (`0`) to mark a user entry.
 *
 * @param {object} suggestion A single autocomplete suggestion object.
 * @return {{id: string, label: string, subline: string}|null} Option or null when it isn't a user.
 */
function toUserOption(suggestion) {
	if (!suggestion || typeof suggestion !== 'object') return null
	const isUser = suggestion.source === 'users'
		|| suggestion.shareType === 0
		|| (suggestion.value && suggestion.value.shareType === 0)
	if (!isUser) return null
	const uid = suggestion.id
		|| (suggestion.value && suggestion.value.shareWith)
	if (uid === undefined || uid === null || uid === '') return null
	return {
		id: String(uid),
		label: suggestion.label || String(uid),
		subline: suggestion.subline || '',
	}
}

/**
 * Search Nextcloud users by name/UID via the core autocomplete OCS endpoint.
 *
 * Fails soft: any network/HTTP error resolves to an empty list (the caller —
 * CnFormDialog — degrades to a plain text input on repeated failure) and the
 * error is swallowed so the console isn't spammed during typing.
 *
 * @param {string} [query] The search term (empty loads an initial page).
 * @param {object} [options] Tuning options.
 * @param {number} [options.limit] Max results (default 25).
 * @return {Promise<Array<{id: string, label: string, subline: string}>>} Picker options.
 */
export async function searchNextcloudUsers(query = '', options = {}) {
	const { limit = 25 } = options
	try {
		const url = generateOcsUrl('core/autocomplete/get')
		const response = await axios.get(url, {
			headers: {
				'OCS-APIRequest': 'true',
				Accept: 'application/json',
			},
			params: {
				search: query || '',
				itemType: ' ',
				itemId: ' ',
				'shareTypes[]': 0,
				limit,
			},
		})
		// OCS envelope: { ocs: { data: [ ... ] } }; tolerate a bare array too.
		const data = response
			&& response.data
			&& response.data.ocs
			&& response.data.ocs.data
		const list = Array.isArray(data)
			? data
			: (Array.isArray(response && response.data) ? response.data : [])
		return list
			.map(toUserOption)
			.filter((opt) => opt !== null)
	} catch {
		return []
	}
}

/**
 * Resolve a single user UID to a `{ id, label }` option for edit-mode display.
 * Tries the autocomplete endpoint with the UID as the query and matches the
 * exact UID; falls back to `{ id: uid, label: uid }` so the select always
 * shows at least the stored UID even when the name can't be resolved.
 *
 * @param {string} uid The stored user UID.
 * @return {Promise<{id: string, label: string}>} The resolved option.
 */
export async function resolveNextcloudUser(uid) {
	const fallback = { id: String(uid), label: String(uid) }
	if (uid === undefined || uid === null || uid === '') return fallback
	const results = await searchNextcloudUsers(String(uid))
	const match = results.find((opt) => opt.id === String(uid))
	return match || fallback
}
