/**
 * Nextcloud group search for the schema-driven form's group picker
 * (a property marked `format: 'nc-group'` or `referenceType: 'nextcloud-group'`).
 *
 * Asks the core autocomplete OCS endpoint for groups first: every signed-in
 * user may call it, and it returns the group's display name. The provisioning
 * endpoint `cloud/groups` is the fallback; it also answers non-admins, but it
 * returns only group ids, so the id doubles as the label there.
 *
 * Options are `{ id: <gid>, label: <display name> }`: the form stores the gid.
 *
 * @module utils/groupAutocomplete
 */

import axios from '@nextcloud/axios'
import { generateOcsUrl } from '@nextcloud/router'

const OCS_HEADERS = {
	'OCS-APIRequest': 'true',
	Accept: 'application/json',
}

/**
 * Read the `ocs.data` payload, tolerating a bare body.
 *
 * @param {object} response An axios response.
 * @return {unknown} The data.
 */
function ocsData(response) {
	const body = response && response.data
	return body && body.ocs ? body.ocs.data : body
}

/**
 * Map one autocomplete suggestion to an option, keeping only groups.
 *
 * @param {object} suggestion An autocomplete suggestion.
 * @return {{id: string, label: string}|null} The option, or null when it is not a group.
 */
function toGroupOption(suggestion) {
	if (!suggestion || typeof suggestion !== 'object') {
		return null
	}
	const isGroup = suggestion.source === 'groups'
		|| suggestion.shareType === 1
		|| (suggestion.value && suggestion.value.shareType === 1)
	if (!isGroup) {
		return null
	}
	const gid = suggestion.id || (suggestion.value && suggestion.value.shareWith)
	if (gid === undefined || gid === null || gid === '') {
		return null
	}
	return { id: String(gid), label: suggestion.label || String(gid) }
}

/**
 * Search Nextcloud groups by name or id. Fails soft: an error yields `[]`.
 *
 * @spec openspec/changes/form-pickers-from-schema/specs/schema-utilities/spec.md
 * @param {string} [query] The search term (empty loads a first page).
 * @param {object} [options] Tuning options.
 * @param {number} [options.limit] Max results (default 25).
 * @return {Promise<Array<{id: string, label: string}>>} Picker options.
 */
export async function searchNextcloudGroups(query = '', options = {}) {
	const { limit = 25 } = options
	try {
		const response = await axios.get(generateOcsUrl('core/autocomplete/get'), {
			headers: OCS_HEADERS,
			params: {
				search: query || '',
				itemType: ' ',
				itemId: ' ',
				'shareTypes[]': 1,
				limit,
			},
		})
		const list = ocsData(response)
		const groups = (Array.isArray(list) ? list : [])
			.map(toGroupOption)
			.filter((opt) => opt !== null)
		if (groups.length > 0) {
			return groups
		}
	} catch {
		// Fall through to the provisioning endpoint.
	}
	try {
		const response = await axios.get(generateOcsUrl('cloud/groups'), {
			headers: OCS_HEADERS,
			params: { search: query || '', limit },
		})
		const data = ocsData(response)
		const gids = data && Array.isArray(data.groups) ? data.groups : []
		return gids
			.filter((gid) => typeof gid === 'string' && gid !== '')
			.map((gid) => ({ id: gid, label: gid }))
	} catch {
		return []
	}
}

/**
 * Resolve a stored gid to `{ id, label }` for edit-mode display. Falls back
 * to the gid itself when the name cannot be looked up.
 *
 * @spec openspec/changes/form-pickers-from-schema/specs/schema-utilities/spec.md
 * @param {string} gid The stored group id.
 * @return {Promise<{id: string, label: string}>} The resolved option.
 */
export async function resolveNextcloudGroup(gid) {
	const fallback = { id: String(gid), label: String(gid) }
	if (gid === undefined || gid === null || gid === '') {
		return fallback
	}
	const results = await searchNextcloudGroups(String(gid))
	return results.find((opt) => opt.id === String(gid)) || fallback
}
