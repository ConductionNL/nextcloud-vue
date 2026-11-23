/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import { markRaw } from 'vue'

let kit = null
let pending = null

/**
 * The CodeMirror kit (codemirrorKit.js) once it has loaded, otherwise null.
 *
 * @return {object|null} The kit's exports.
 */
export function loadedCodemirrorKit() {
	return kit
}

/**
 * Load the CodeMirror kit once for every editor on the page.
 *
 * @return {Promise<object|null>} The kit's exports, or null when it failed to load.
 */
export function loadCodemirrorKit() {
	if (kit) {
		return Promise.resolve(kit)
	}
	if (!pending) {
		pending = import('./codemirrorKit.js')
			.then((mod) => {
				kit = markRaw({ ...mod })
				return kit
			})
			.catch((error) => {
				pending = null
				// eslint-disable-next-line no-console
				console.error('[nextcloud-vue] CodeMirror could not be loaded', error)
				return null
			})
	}
	return pending
}
