/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The QR encoder, read back by a separate decoder: a code that draws is not a
 * code that says the right thing.
 *
 * @spec openspec/changes/qr-code/specs/qr-code/spec.md
 */
import { TextDecoder, TextEncoder } from 'node:util'
import { BLOCKS_M, byteCapacity, encodeQr, formatBits, reedSolomon, TOTAL_CODEWORDS, versionBits } from '../../src/utils/qr.js'
import { decodeQr } from '../support/qrDecode.js'

globalThis.TextEncoder ??= TextEncoder
globalThis.TextDecoder ??= TextDecoder

describe('encodeQr', () => {
	it.each([1, 14, 15, 26, 27, 42, 43, 62, 84, 106, 122, 152, 180, 213, 214, 400, 666])('reads back at %i bytes, in the smallest version that holds it', (length) => {
		const text = Array.from({ length }, (_, i) => String.fromCharCode(33 + ((i * 7) % 90))).join('')
		const symbol = encodeQr(text)
		const decoded = decodeQr(symbol.modules)
		expect([decoded.text === text, decoded.blocksHold, decoded.copiesAgree]).toEqual([true, true, true])
		expect(byteCapacity(symbol.version)).toBeGreaterThanOrEqual(length)
		if (symbol.version > 1) {
			expect(byteCapacity(symbol.version - 1)).toBeLessThan(length)
		}
	})

	it('draws no code for an empty text or one too long for version 20', () => {
		expect(encodeQr('')).toBeNull()
		expect(encodeQr('x'.repeat(667))).toBeNull()
	})

	it('reads back any Unicode', () => {
		expect(decodeQr(encodeQr('Zoë €5 ✓').modules).text).toBe('Zoë €5 ✓')
	})

	it('has tables that add up to the totals of the standard', () => {
		TOTAL_CODEWORDS.forEach((total, index) => {
			const [ec, groups] = BLOCKS_M[index]
			expect(groups.reduce((sum, [count, data]) => sum + count * (data + ec), 0)).toBe(total)
		})
	})

	it('matches the worked examples of the standard', () => {
		expect(reedSolomon([32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17], 10)).toEqual([196, 35, 39, 119, 235, 215, 231, 226, 93, 23])
		expect(formatBits(0).toString(2).padStart(15, '0')).toBe('101010000010010')
		expect(versionBits(7).toString(2).padStart(18, '0')).toBe('000111110010010100')
		expect(encodeQr('HELLO').size).toBe(21)
	})
})
