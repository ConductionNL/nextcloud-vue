/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * What a duplicate warning offers, decided in one place, and the candidate an
 * app sends to OpenRegister's duplicate check. None of this enforces
 * anything: the server refuses a duplicate on the write. These helpers make
 * sure the user is told before pressing Create rather than after.
 *
 * @module utils/duplicateWarning
 */

/**
 * What the duplicate warning shows and which buttons it offers.
 *
 * A policy other than `block` reads as `warn`, as on the server. `checked:
 * false` means the check never answered: nothing is shown, because the write
 * still refuses a real duplicate.
 *
 * @spec openspec/changes/duplicate-warning/specs/duplicate-warning/spec.md#requirement-a-generic-duplicate-warning
 * @param {object} state The state to decide from.
 * @param {Array<object>} [state.matches] The scored matches.
 * @param {boolean} [state.checked] Whether the check ran (default true).
 * @param {string} [state.policy] `warn` or `block`.
 * @param {boolean} [state.mayOverride] Whether this account may file over a block.
 * @return {{show: boolean, blocked: boolean, mayContinue: boolean, needsReason: boolean}} What to draw.
 */
export function duplicateAffordances(state) {
	const source = state || {}
	const matches = Array.isArray(source.matches) ? source.matches : []
	const show = source.checked !== false && matches.length > 0
	const blocked = show && source.policy === 'block'
	const mayOverride = source.mayOverride === true
	return {
		show,
		blocked,
		mayContinue: show && (!blocked || mayOverride),
		needsReason: blocked && mayOverride,
	}
}

/**
 * The candidate to send to the duplicate check, without blank fields.
 *
 * OpenRegister scores two empty strings as a match, and a form sends `''`
 * for every field nobody filled in, so blanks would match almost everything.
 *
 * @spec openspec/changes/duplicate-warning/specs/duplicate-warning/spec.md#requirement-a-generic-duplicate-warning
 * @param {object} payload The form's values.
 * @return {object} The candidate.
 */
export function candidateWithoutBlanks(payload) {
	return Object.fromEntries(Object.entries(payload || {}).filter(([, value]) => {
		if (value === null || value === undefined || value === '') {
			return false
		}
		return !Array.isArray(value) || value.length > 0
	}))
}
