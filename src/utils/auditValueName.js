/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The display name of a user or group id an audit entry recorded, for the
 * `{from}` / `{to}` of a change rule with `values: "user"` or `"group"`.
 * Reactive: read in a render, it updates when the name arrives. Kept apart
 * from auditLabels.js, which imports no request code.
 *
 * @module utils/auditValueName
 */

import { groupDisplayName, loadGroupDisplayName } from './groupAutocomplete.js'
import { userDisplayName } from './userDisplayName.js'

/**
 * The display name of an id, '' while it loads.
 *
 * @param {'user'|'group'} kind What the id names.
 * @param {string} id The id.
 * @return {string} The display name, or '' while loading.
 * @spec openspec/changes/audit-change-from-to/specs/audit-trail/spec.md#requirement-a-change-label-can-say-from-what-to-what
 */
export function auditValueName(kind, id) {
	if (kind === 'user') {
		return userDisplayName(id)
	}
	if (kind === 'group') {
		const known = groupDisplayName(id)
		if (known === null) {
			loadGroupDisplayName(id)
			return ''
		}
		return known
	}
	return ''
}
