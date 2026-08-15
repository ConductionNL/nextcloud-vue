/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * OpenRegister's audit-trail entries carry only a per-field `changed`
 * diff (`{fieldName: {old, new}}`) computed server-side at write time
 * (`AuditTrailMapper::createAuditTrail`) — there is no "full object
 * snapshot at version N" endpoint. `foldAuditTrailEntries` folds an
 * ordered range of entries into a single synthetic before/after state
 * pair so a version-range compare can be diffed with the exact same
 * `computeObjectDiff` used for a single entry.
 *
 * @module utils/auditTrailDiff
 */

/**
 * Folded before/after state for a range of audit-trail entries.
 *
 * @typedef {object} FoldedAuditState
 * @property {object} oldState First-seen `old` value per touched field.
 * @property {object} newState Last-seen `new` value per touched field.
 */

/**
 * Fold an oldest-first ordered array of OpenRegister audit-trail
 * entries into a single `{oldState, newState}` pair.
 *
 * For every field touched by any entry in the range, `oldState[field]`
 * is the `old` value from the first entry (in array order) that
 * touched it, and `newState[field]` is the `new` value from the last
 * entry that touched it — intermediate values in between do not leak
 * into either side. Entries that are `null`/`undefined`, or whose
 * `changed` property is missing or not a plain object, are skipped
 * without throwing.
 *
 * @param {Array<{changed?: Record<string, {old: *, new: *}>}>} entries Oldest-first ordered audit-trail entries.
 * @return {FoldedAuditState} The folded before/after state pair.
 */
export function foldAuditTrailEntries(entries) {
	const oldState = {}
	const newState = {}
	const seenFields = new Set()

	const list = Array.isArray(entries) ? entries : []
	for (const entry of list) {
		if (entry === null || typeof entry !== 'object') {
			continue
		}
		const changed = entry.changed
		if (changed === null || typeof changed !== 'object' || Array.isArray(changed) === true) {
			continue
		}
		for (const field of Object.keys(changed)) {
			const delta = changed[field]
			if (delta === null || typeof delta !== 'object') {
				continue
			}
			if (seenFields.has(field) === false) {
				oldState[field] = delta.old
				seenFields.add(field)
			}
			newState[field] = delta.new
		}
	}

	return { oldState, newState }
}

export default foldAuditTrailEntries
