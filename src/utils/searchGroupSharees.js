/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The groups a user may share with, from Nextcloud's sharee API (the source
 * the Files share dialog uses), so a saved view can be shared with exactly
 * the groups the instance lets this user share with.
 *
 * @spec openspec/changes/saved-views-shared-by-role/tasks.md#task-2
 */
import axios from '@nextcloud/axios'
import { generateOcsUrl } from '@nextcloud/router'

/**
 * Search the sharee API for the given share types. Fails soft: any error
 * answers `[]`, and so does an instance where sharing is off.
 *
 * @param {string} query The search term.
 * @param {Array<number>} shareTypes Nextcloud share types (0 user, 1 group).
 * @param {number} limit Max results per type.
 * @return {Promise<Array<{id: string, kind: 'user'|'group', label: string}>>} The sharees, exact matches first.
 */
async function searchSharees(query, shareTypes, limit) {
	try {
		const response = await axios.get(generateOcsUrl('apps/files_sharing/api/v1/sharees'), {
			headers: { 'OCS-APIRequest': 'true', Accept: 'application/json' },
			params: { search: query || '', itemType: 'file', shareType: shareTypes, perPage: limit, lookup: false, format: 'json' },
		})
		const body = response && response.data
		const data = body && body.ocs ? body.ocs.data : body
		const exact = (data && data.exact) || {}
		const lists = [
			...(exact.users || []).map((e) => ['user', e]),
			...(exact.groups || []).map((e) => ['group', e]),
			...((data && data.users) || []).map((e) => ['user', e]),
			...((data && data.groups) || []).map((e) => ['group', e]),
		]
		const seen = new Set()
		const out = []
		for (const [kind, entry] of lists) {
			const id = entry && entry.value ? entry.value.shareWith : undefined
			if (id === undefined || id === null || id === '' || seen.has(`${kind}:${id}`)) {
				continue
			}
			seen.add(`${kind}:${id}`)
			out.push({ id: String(id), kind, label: entry.label || String(id) })
		}
		return out
	} catch {
		return []
	}
}

/**
 * Search the sharee API for groups. Fails soft: any error answers `[]`, and so
 * does an instance where sharing is off, so the caller can hide the section.
 *
 * @param {string} [query] The search term (empty loads a first page).
 * @param {object} [options] Tuning options.
 * @param {number} [options.limit] Max results (default 25).
 * @return {Promise<Array<{id: string, label: string}>>} Group options (`id` is the group id).
 */
export async function searchGroupSharees(query = '', options = {}) {
	const { limit = 25 } = options
	const found = await searchSharees(query, [1], limit)
	return found.filter((s) => s.kind === 'group').map(({ id, label }) => ({ id, label }))
}

/**
 * Search the sharee API for users and groups, within the instance's own
 * sharing settings (the source the Files share dialog uses).
 *
 * @param {string} [query] The search term (empty loads a first page).
 * @param {object} [options] Tuning options.
 * @param {number} [options.limit] Max results per type (default 25).
 * @return {Promise<Array<{id: string, kind: 'user'|'group', label: string}>>} The sharees.
 * @spec openspec/changes/saved-views-manage-and-defaults/tasks.md#task-5
 */
export async function searchUserAndGroupSharees(query = '', options = {}) {
	const { limit = 25 } = options
	return searchSharees(query, [0, 1], limit)
}
