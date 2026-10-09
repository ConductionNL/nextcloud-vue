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
	try {
		const response = await axios.get(generateOcsUrl('apps/files_sharing/api/v1/sharees'), {
			headers: { 'OCS-APIRequest': 'true', Accept: 'application/json' },
			params: { search: query || '', itemType: 'file', shareType: [1], perPage: limit, lookup: false, format: 'json' },
		})
		const body = response && response.data
		const data = body && body.ocs ? body.ocs.data : body
		const lists = [...((data && data.exact && data.exact.groups) || []), ...((data && data.groups) || [])]
		const seen = new Set()
		const out = []
		for (const entry of lists) {
			const id = entry && entry.value ? entry.value.shareWith : undefined
			if (id === undefined || id === null || id === '' || seen.has(String(id))) {
				continue
			}
			seen.add(String(id))
			out.push({ id: String(id), label: entry.label || String(id) })
		}
		return out
	} catch {
		return []
	}
}
