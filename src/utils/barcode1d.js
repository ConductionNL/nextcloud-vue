/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * One-dimensional barcodes as module runs: Code 128 (code set B, printable
 * ASCII) and EAN-13. Each encoder answers the bar pattern as a string of
 * `1` (bar) and `0` (space) modules, or null when the value cannot be
 * encoded. Drawing is the caller's (CnCodeWidget draws an SVG).
 *
 * @module utils/barcode1d
 * @spec openspec/changes/code-widget/specs/code-widget/spec.md
 */

/** Code 128 bar/space widths per symbol value 0..106 (106 is the stop). */
export const CODE128_WIDTHS = Object.freeze((
	'212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 '
	+ '221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 '
	+ '221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 '
	+ '212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 '
	+ '231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 '
	+ '231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 '
	+ '314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 '
	+ '112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 '
	+ '111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 '
	+ '214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 '
	+ '114131 311141 411131 211412 211214 211232 2331112'
).split(' '))

const START_B = 104
const STOP = 106

/**
 * Bar/space widths as modules, starting with a bar.
 *
 * @param {string} widths The widths, e.g. `212222`.
 * @return {string} The modules.
 */
function widthsToModules(widths) {
	let out = ''
	for (let i = 0; i < widths.length; i++) {
		out += (i % 2 === 0 ? '1' : '0').repeat(Number(widths[i]))
	}
	return out
}

/**
 * Code 128 symbol values (code set B) for a text, with start, check and stop.
 *
 * @param {string} text Printable ASCII (32..126).
 * @return {number[]|null} The values, or null for text set B cannot hold.
 */
export function code128Values(text) {
	const value = String(text ?? '')
	if (value === '') {
		return null
	}
	const values = [START_B]
	for (const char of value) {
		const code = char.charCodeAt(0)
		if (char.length !== 1 || code < 32 || code > 126) {
			return null
		}
		values.push(code - 32)
	}
	const check = values.reduce((sum, v, i) => sum + (i === 0 ? v : v * i), 0) % 103
	return [...values, check, STOP]
}

/**
 * A text as Code 128 modules, with the quiet zones left to the drawing.
 *
 * @param {string} text Printable ASCII.
 * @return {string|null} The modules, or null.
 * @spec openspec/changes/code-widget/specs/code-widget/spec.md#requirement-a-detail-page-can-show-a-record-as-a-code
 */
export function encodeCode128(text) {
	const values = code128Values(text)
	return values ? values.map((v) => widthsToModules(CODE128_WIDTHS[v])).join('') : null
}

const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011']
const EAN_PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL']

/**
 * The EAN-13 check digit of the first twelve digits.
 *
 * @param {string} twelve Twelve digits.
 * @return {number} The check digit.
 */
export function eanCheckDigit(twelve) {
	const sum = [...twelve].reduce((acc, digit, i) => acc + Number(digit) * (i % 2 === 0 ? 1 : 3), 0)
	return (10 - (sum % 10)) % 10
}

/**
 * Twelve or thirteen digits as EAN-13 modules. Twelve digits get their check
 * digit; thirteen must carry the right one.
 *
 * @param {string} digits The number.
 * @return {{modules: string, digits: string}|null} The modules and the full number, or null.
 * @spec openspec/changes/code-widget/specs/code-widget/spec.md#requirement-a-detail-page-can-show-a-record-as-a-code
 */
export function encodeEan13(digits) {
	const value = String(digits ?? '').trim()
	if (!/^\d{12,13}$/.test(value)) {
		return null
	}
	const check = eanCheckDigit(value.slice(0, 12))
	if (value.length === 13 && Number(value[12]) !== check) {
		return null
	}
	const full = value.slice(0, 12) + check
	const R = EAN_L.map((code) => [...code].map((bit) => (bit === '1' ? '0' : '1')).join(''))
	const G = R.map((code) => [...code].reverse().join(''))
	const parity = EAN_PARITY[Number(full[0])]
	let modules = '101'
	for (let i = 1; i <= 6; i++) {
		const digit = Number(full[i])
		modules += parity[i - 1] === 'L' ? EAN_L[digit] : G[digit]
	}
	modules += '01010'
	for (let i = 7; i <= 12; i++) {
		modules += R[Number(full[i])]
	}
	modules += '101'
	return { modules, digits: full }
}
