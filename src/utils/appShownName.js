/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * appShownName: the name of an app as people read it, for copy such as
 * "What {app} uses". An app id ("launchpad") is not a name.
 *
 * @module utils/appShownName
 */

import { loadState } from '@nextcloud/initial-state'

/**
 * The name Nextcloud's own app menu shows for an app, or '' when the menu
 * does not list it.
 *
 * @param {string} appId The app id.
 * @return {string} The localised name.
 */
function menuNameOf(appId) {
	let entries
	try {
		entries = loadState('core', 'apps', [])
	} catch {
		entries = []
	}
	const list = Array.isArray(entries) ? entries : (entries && typeof entries === 'object' ? Object.values(entries) : [])
	const usable = list.filter((entry) => entry && typeof entry === 'object' && typeof entry.name === 'string' && entry.name.trim() !== '')
	const found = usable.find((entry) => entry.id === appId) || usable.find((entry) => entry.app === appId && (entry.type === undefined || entry.type === 'link'))
	return found ? found.name.trim() : ''
}

/**
 * The display name of an app: the name the host gave when that is a real name
 * (not empty and not the id itself), else the name in Nextcloud's app menu,
 * else the id with a capital.
 *
 * @param {string} appId The app id.
 * @param {string} [given] The name the host passed.
 * @return {string} The display name, or '' when neither is known.
 */
export function appShownName(appId, given = '') {
	const id = typeof appId === 'string' ? appId : ''
	const name = typeof given === 'string' ? given.trim() : ''
	if (name !== '' && name !== id) {
		return name
	}
	if (id === '') {
		return name
	}
	return menuNameOf(id) || id.charAt(0).toUpperCase() + id.slice(1)
}
