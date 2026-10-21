/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import { generateOcsUrl } from '@nextcloud/router'

/**
 * Nextcloud's own directory: groups, the users in a group, and whether a
 * user is in today. Read through the OCS API with the reader's session, so
 * Nextcloud decides what the reader may see (listing a group's members needs
 * an admin or the group's sub-admin).
 *
 * @module utils/nextcloudDirectory
 */

const OCS_HEADERS = { 'OCS-APIRequest': 'true' }

/**
 * The `ocs.data` of an OCS response, or null.
 *
 * @param {object} res An axios response.
 * @return {object|null}
 */
function ocsData(res) {
	return (res && res.data && res.data.ocs && res.data.ocs.data) || null
}

/**
 * The groups, with their member counts.
 *
 * @param {object} axios The axios instance.
 * @param {{search?: string, limit?: number}} [options] Narrowing.
 * @return {Promise<Array<{id: string, name: string, count: number}>>}
 * @spec openspec/changes/index-groups-users-source/specs/index-page/spec.md#requirement-an-index-page-can-list-nextcloud-groups-and-their-members
 */
export async function fetchGroups(axios, options = {}) {
	const res = await axios.get(generateOcsUrl('cloud/groups/details'), {
		params: { search: options.search || '', limit: options.limit || 200, format: 'json' },
		headers: OCS_HEADERS,
	})
	const groups = (ocsData(res) && ocsData(res).groups) || []
	return groups.map((group) => ({
		id: String(group.id),
		name: group.displayname || String(group.id),
		count: Number(group.usercount) || 0,
	}))
}

/**
 * The members of one group, with their details.
 *
 * @param {object} axios The axios instance.
 * @param {string} groupId The group id.
 * @return {Promise<Array<object>>} Nextcloud's user details, one per member.
 * @spec openspec/changes/index-groups-users-source/specs/index-page/spec.md#requirement-an-index-page-can-list-nextcloud-groups-and-their-members
 */
export async function fetchGroupMembers(axios, groupId) {
	const res = await axios.get(generateOcsUrl('cloud/groups/{groupId}/users/details', { groupId }), {
		params: { format: 'json' },
		headers: OCS_HEADERS,
	})
	const users = (ocsData(res) && ocsData(res).users) || {}
	return Array.isArray(users) ? users : Object.values(users)
}

/**
 * Every user the reader may list, with their details: all users for an
 * admin, the users of their groups for a sub-admin. Refused for others.
 *
 * @param {object} axios The axios instance.
 * @param {{limit?: number}} [options] How many to read.
 * @return {Promise<Array<object>>} Nextcloud's user details, one per user.
 */
export async function fetchUsers(axios, options = {}) {
	const res = await axios.get(generateOcsUrl('cloud/users/details'), {
		params: { limit: options.limit || 500, format: 'json' },
		headers: OCS_HEADERS,
	})
	const users = (ocsData(res) && ocsData(res).users) || {}
	return Array.isArray(users) ? users : Object.values(users)
}

/**
 * Whether a user is in today: an out-of-office period that runs now (the
 * dav app's absence, Nextcloud 28 and later), else their user status.
 *
 * @param {object} axios The axios instance.
 * @param {string} userId The user id.
 * @param {object|null} status The user's entry from the user status list, or null.
 * @return {Promise<{state: string, until: (string|null), message: string}>}
 *   `state` is `absent` (with `until`, an ISO date), `away`, `present` or `unknown`.
 * @spec openspec/changes/index-groups-users-source/specs/index-page/spec.md#requirement-an-index-page-can-list-nextcloud-groups-and-their-members
 */
export async function fetchPresence(axios, userId, status) {
	try {
		const res = await axios.get(generateOcsUrl('apps/dav/api/v1/outOfOffice/{userId}/now', { userId }), { params: { format: 'json' }, headers: OCS_HEADERS })
		const ooo = ocsData(res)
		if (ooo && ooo.endDate) {
			const end = typeof ooo.endDate === 'number' ? new Date(ooo.endDate * 1000) : new Date(ooo.endDate)
			return { state: 'absent', until: Number.isNaN(end.getTime()) ? null : end.toISOString().slice(0, 10), message: ooo.shortMessage || '' }
		}
	} catch {
		// 404: no absence now, or an instance without the absence API.
	}
	if (status && typeof status === 'object') {
		const message = typeof status.message === 'string' ? status.message : ''
		if (status.status === 'online') {
			return { state: 'present', until: null, message }
		}
		if (status.status === 'away' || status.status === 'dnd') {
			return { state: 'away', until: null, message }
		}
	}
	return { state: 'unknown', until: null, message: '' }
}

/**
 * The user statuses Nextcloud shares with the reader, by user id. Empty when
 * the user status app is off.
 *
 * @param {object} axios The axios instance.
 * @return {Promise<Record<string, object>>}
 * @spec openspec/changes/index-groups-users-source/specs/index-page/spec.md#requirement-an-index-page-can-list-nextcloud-groups-and-their-members
 */
export async function fetchStatuses(axios) {
	try {
		const res = await axios.get(generateOcsUrl('apps/user_status/api/v1/statuses'), { params: { limit: 500, format: 'json' }, headers: OCS_HEADERS })
		const list = ocsData(res) || []
		return Object.fromEntries((Array.isArray(list) ? list : []).map((entry) => [entry.userId, entry]))
	} catch {
		return {}
	}
}
