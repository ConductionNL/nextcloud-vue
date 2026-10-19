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
 * @param {object} props CnDuplicateWarning's props (`matches`, `records`, `policy`, `mayOverride`, ...).
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
		app = createApp(CnDuplicateWarning, { ...(props || {}), onClose: () => finish(null), onFile: (decision) => finish(decision) })
		app.mount(host)
	})
}
