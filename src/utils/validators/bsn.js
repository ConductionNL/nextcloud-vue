/**
 * BSN (Burgerservicenummer) validation — client side.
 *
 * The BSN is the Dutch citizen service number. Its formal validity is a pure
 * function of the digits: nine characters, all numeric, satisfying the
 * "elfproef" (eleven-test). No lookup, no secret, no server state.
 *
 * That is why it belongs here. A round trip to an HTTP endpoint to learn
 * whether nine digits satisfy a checksum costs a network hop per keystroke,
 * cannot work offline, and — because the request body carries the raw BSN —
 * puts special-category personal data on the wire to answer a question the
 * browser could have answered itself.
 *
 * WHAT THIS IS NOT
 * ----------------
 * This is a UX affordance, not a security control, and it does not replace
 * server-side validation. Two other layers remain authoritative:
 *
 *   1. OpenRegister's schema property validator (`bsn` format) — the write
 *      boundary. A value that never passed through this form still gets
 *      checked there.
 *   2. Any consuming app's own persistence checks.
 *
 * Deleting a backend check because this exists would be a mistake: anything
 * reaching the API directly bypasses the browser entirely. The thing that is
 * genuinely redundant is a *dedicated validation endpoint* whose only job is
 * to return a yes/no about a checksum.
 *
 * A formally valid BSN is not necessarily an ISSUED one. The elfproef proves
 * the number is well-formed, nothing more — only a BRP lookup establishes that
 * it belongs to a real person.
 *
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * Error code: the input was not nine digits.
 * @type {string}
 */
export const BSN_ERROR_LENGTH = 'length'

/**
 * Error code: nine digits, but the elfproef checksum did not hold.
 * @type {string}
 */
export const BSN_ERROR_CHECKSUM = 'checksum'

/**
 * Mask a BSN for display, logging or audit storage.
 *
 * The raw BSN is special-category personal data under the AVG. Only the masked
 * form is safe to render, log, or persist alongside an audit record.
 *
 * The shape is `***XXXX*` — characters at index 3..6 revealed, the rest
 * starred. This MUST stay byte-identical to pipelinq's
 * `BsnValidationService::mask()`, because that masked value is what gets
 * written to audit records: if the form showed one masking and the audit trail
 * stored another, the two could not be reconciled after the fact.
 *
 * An input shorter than five characters is starred out completely rather than
 * partially revealed — a partial mask of a short input leaks proportionally
 * more of it than a mask of a full one.
 *
 * @param {string} input The raw BSN, or any string to be masked.
 * @return {string} The masked variant; empty string for empty input.
 */
export function maskBsn(input) {
	const value = String(input ?? '')
	if (value.length === 0) {
		return ''
	}

	if (value.length < 5) {
		return '*'.repeat(value.length)
	}

	return '***' + value.slice(3, 7) + '*'
}

/**
 * Validate a BSN against the elfproef.
 *
 * The elfproef: sum(digit[i] * (9 - i)) for i = 0..7, then SUBTRACT digit[8];
 * the number is formally valid when that sum is divisible by eleven. The final
 * digit carrying a weight of -1 rather than +1 is the part most
 * reimplementations get wrong, and getting it wrong accepts roughly one in
 * eleven invalid numbers rather than rejecting them.
 *
 * @param {string} input The candidate BSN.
 * @return {{isFormeelGeldig: boolean, elfproefScore: number, errorCode: (string|null), maskedBsn: string}}
 *         `elfproefScore` is the modulo (0 when valid) or -1 when the input was
 *         not nine digits. `errorCode` is null when valid. The raw input is
 *         never echoed back — only `maskedBsn`.
 */
export function validateBsn(input) {
	const value = String(input ?? '')

	if (value.length !== 9 || /^\d{9}$/.test(value) === false) {
		return {
			isFormeelGeldig: false,
			elfproefScore: -1,
			errorCode: BSN_ERROR_LENGTH,
			maskedBsn: maskBsn(value),
		}
	}

	let sum = 0
	for (let i = 0; i < 8; i++) {
		sum += Number(value[i]) * (9 - i)
	}

	// The ninth digit weighs -1. See the note above.
	sum -= Number(value[8])

	const modulo = sum % 11
	const isValid = modulo === 0

	return {
		isFormeelGeldig: isValid,
		elfproefScore: modulo,
		errorCode: isValid ? null : BSN_ERROR_CHECKSUM,
		maskedBsn: maskBsn(value),
	}
}
