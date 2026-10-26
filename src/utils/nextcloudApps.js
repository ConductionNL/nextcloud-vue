/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import { generateOcsUrl } from '@nextcloud/router'

/**
 * The apps in Nextcloud's navigation and their display names, read once per
 * page load from the OCS navigation endpoint with the reader's session. An
 * app outside the navigation, or a failed read, has no entry.
 *
 * @module utils/nextcloudApps
 */

let pending = null

/**
 * The entries of Nextcloud's navigation, read once per page load.
 *
 * @param {object} axios The axios instance.
 * @return {Promise<object[]>} The raw entries; empty when the read fails.
 */
function navigationEntries(axios) {
	if (!pending) {
		pending = axios.get(generateOcsUrl('core/navigation/apps'), { params: { format: 'json' }, headers: { 'OCS-APIRequest': 'true' } })
			.then((res) => {
				const entries = (res && res.data && res.data.ocs && res.data.ocs.data) || []
				return Array.isArray(entries) ? entries : Object.values(entries)
			})
			.catch(() => [])
	}
	return pending
}

/**
 * The app display names by app id.
 *
 * @param {object} axios The axios instance.
 * @return {Promise<Record<string, string>>} The names; empty when the read fails.
 */
export function appDisplayNames(axios) {
	return navigationEntries(axios).then((entries) => {
		const names = {}
		for (const entry of entries) {
			const id = entry && (entry.app || entry.id)
			if (id && typeof entry.name === 'string' && entry.name !== '') {
				names[String(id)] = entry.name
			}
		}
		return names
	})
}

/**
 * The apps in Nextcloud's navigation, in its order: `{ id, label, href,
 * icon }` for every entry that has a name and a link. `icon` is the app's
 * navigation icon URL ('' when it has none).
 *
 * @param {object} axios The axios instance.
 * @return {Promise<Array<{id: string, label: string, href: string, icon: string}>>} The apps; empty when the read fails.
 */
export function navigationApps(axios) {
	return navigationEntries(axios).then((entries) => entries
		.filter((entry) => entry && (entry.app || entry.id) && typeof entry.name === 'string' && entry.name !== '' && typeof entry.href === 'string' && entry.href !== '')
		.map((entry) => ({
			id: String(entry.app || entry.id),
			label: entry.name,
			href: entry.href,
			icon: typeof entry.icon === 'string' ? entry.icon : '',
		})))
}

/**
 * Forget the names read, so the next call reads them again.
 *
 * @return {void}
 */
export function clearAppDisplayNames() {
	pending = null
}
