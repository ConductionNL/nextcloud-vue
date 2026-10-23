/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * contactHref: a phone number, an email address or a postal address as the
 * link a phone or a mail program opens (`tel:`, `mailto:`, `geo:`).
 *
 * @module utils/contactHref
 */

/**
 * The link for a value, or null when the value makes none.
 *
 * - `tel`: the digits and a leading `+`; `00` at the start becomes `+`.
 * - `mailto`: one address with an `@`.
 * - `geo`: the address lines joined by commas, as a map query.
 *
 * @param {'tel'|'mailto'|'geo'} scheme The link kind.
 * @param {unknown} value The value.
 * @return {string|null} The link.
 */
export function contactHref(scheme, value) {
	const raw = String(value ?? '').trim()
	if (scheme === 'tel') {
		if (!/\d/.test(raw)) {
			return null
		}
		let digits = raw.replace(/[^\d+]/g, '')
		const plus = digits.startsWith('+')
		digits = digits.replace(/\+/g, '')
		if (!plus && digits.startsWith('00')) {
			return 'tel:+' + digits.slice(2)
		}
		return 'tel:' + (plus ? '+' : '') + digits
	}
	if (scheme === 'mailto') {
		return /^[^\s@]+@[^\s@]+$/.test(raw) ? 'mailto:' + raw : null
	}
	if (scheme === 'geo') {
		const query = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).join(', ')
		return query ? 'geo:0,0?q=' + encodeURIComponent(query) : null
	}
	return null
}
