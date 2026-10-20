/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import { generateOcsUrl } from '@nextcloud/router'

/**
 * The display names of the apps in Nextcloud's navigation, by app id, read
 * once per page load from the OCS navigation endpoint with the reader's
 * session. An app outside the navigation, or a failed read, has no entry.
 *
 * @module utils/nextcloudApps
 */

let pending = null

/**
 * The app display names by app id.
 *
 * @param {object} axios The axios instance.
 * @return {Promise<Record<string, string>>} The names; empty when the read fails.
 */
export function appDisplayNames(axios) {
	if (!pending) {
		pending = axios.get(generateOcsUrl('core/navigation/apps'), { params: { format: 'json' }, headers: { 'OCS-APIRequest': 'true' } })
			.then((res) => {
				const entries = (res && res.data && res.data.ocs && res.data.ocs.data) || []
				const names = {}
				for (const entry of Array.isArray(entries) ? entries : Object.values(entries)) {
					const id = entry && (entry.app || entry.id)
					if (id && typeof entry.name === 'string' && entry.name !== '') {
						names[String(id)] = entry.name
					}
				}
				return names
			})
			.catch(() => ({}))
	}
	return pending
}

/**
 * Forget the names read, so the next call reads them again.
 *
 * @return {void}
 */
export function clearAppDisplayNames() {
	pending = null
}
