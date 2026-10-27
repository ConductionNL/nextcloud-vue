/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Open CnDuplicateWarning from code (a create override, a store action) and
 * wait for the user's answer.
 *
 * @module utils/openDuplicateWarning
 */

import { createApp } from 'vue'
import CnDuplicateWarning from '../components/CnDuplicateWarning/CnDuplicateWarning.vue'

/**
 * Mount the warning on the page and resolve with the decision: `{ reason,
 * over }` when the user files anyway, null when they cancel.
 *
 * @spec openspec/changes/duplicate-warning/specs/duplicate-warning/spec.md#requirement-a-generic-duplicate-warning
 * @param {object} props CnDuplicateWarning's props (`matches`, `records`, `policy`, `mayOverride`, ...),
 *   and `look` (`board` or `nextcloud`); without it the page's look is used.
 * @return {Promise<{reason: string, over: Array<string>}|null>} The decision.
 */
export function openDuplicateWarning(props) {
	return new Promise((resolve) => {
		const host = document.createElement('div')
		document.body.appendChild(host)
		let app = null
		const finish = (decision) => {
			app.unmount()
			host.remove()
			resolve(decision)
		}
		const { look, ...rest } = props || {}
		app = createApp(CnDuplicateWarning, { ...rest, onClose: () => finish(null), onFile: (decision) => finish(decision) })
		// Mounted outside CnAppRoot, so nothing provides the look: take the
		// caller's, else the board look when the page around it is drawn in it.
		app.provide('cnLook', look || (document.querySelector('.cn-look-board') ? 'board' : 'nextcloud'))
		app.mount(host)
	})
}
