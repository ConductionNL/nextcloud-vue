/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * auditEntries — which audit entries a history shows. Read by the History
 * card (CnAuditTrailCard) and by a tab that counts the history
 * (CnTabsWidget `countFrom.auditTrail`), so the two never disagree.
 */

/**
 * Whether an audit entry is an update that changed no field: its `changed`
 * map holds only `@self` bookkeeping or pairs whose old and new are equal.
 * An entry without a `changed` map is kept, since nothing says it was empty.
 *
 * @param {object} entry The audit entry.
 * @return {boolean}
 */
export function isEmptyUpdate(entry) {
	if (String((entry && (entry.action || entry.event)) || '').toLowerCase() !== 'update') {
		return false
	}
	const changed = entry.changed
	if (!changed || typeof changed !== 'object' || Array.isArray(changed)) {
		return false
	}
	return Object.entries(changed).every(([field, pair]) => field.startsWith('@')
		|| (pair && typeof pair === 'object' && JSON.stringify(pair.old ?? null) === JSON.stringify(pair.new ?? null)))
}

/**
 * The entries a history shows: without the actions and actors it leaves out
 * (case-insensitive) and without updates that changed nothing.
 *
 * @param {Array<object>} entries The audit entries.
 * @param {{excludeActions?: Array<string>, excludeActors?: Array<string>}} [options] What to leave out.
 * @return {Array<object>} The entries kept.
 * @spec openspec/changes/tab-count-audit-trail/specs/tab-counts/spec.md#requirement-a-history-tab-can-count-the-records-changes
 */
export function keepAuditEntries(entries, { excludeActions = [], excludeActors = [] } = {}) {
	const excluded = (Array.isArray(excludeActions) ? excludeActions : []).map((action) => String(action).toLowerCase())
	const actors = (Array.isArray(excludeActors) ? excludeActors : []).map((actor) => String(actor).toLowerCase())
	return (Array.isArray(entries) ? entries : []).filter((entry) => !excluded.includes(String(entry.action || entry.event || '').toLowerCase())
		&& !actors.includes(String(entry.user || '').toLowerCase())
		&& !isEmptyUpdate(entry))
}
