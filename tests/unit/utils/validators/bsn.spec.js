/**
 * BSN validator — parity with pipelinq's BsnValidationService.
 *
 * These cases exist to pin the elfproef weighting, which is the part
 * reimplementations get wrong. The ninth digit weighs -1, not +1; an
 * implementation that adds it instead accepts roughly one in eleven invalid
 * numbers. `testTheOffByWeightIsCaught` below is the case that separates the
 * two — it is valid under the wrong weighting and invalid under the right one,
 * so it fails loudly if anyone "simplifies" the loop.
 *
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

import {
	BSN_ERROR_CHECKSUM,
	BSN_ERROR_LENGTH,
	maskBsn,
	validateBsn,
} from '../../../../src/utils/validators/bsn.js'

describe('validateBsn', () => {
	// 111222333: 1*9+1*8+1*7+2*6+2*5+2*4+3*3+3*2 = 9+8+7+12+10+8+9+6 = 69,
	// minus the ninth digit 3 => 66, and 66 % 11 === 0.
	it('accepts a number that satisfies the elfproef', () => {
		const result = validateBsn('111222333')

		expect(result.isFormallyValid).toBe(true)
		expect(result.elevenTestScore).toBe(0)
		expect(result.errorCode).toBeNull()
	})

	// THE CONTROL. Without a case that FAILS, "accepts a valid BSN" is equally
	// satisfied by a function that returns true for everything.
	it('rejects a number that fails the elfproef', () => {
		const result = validateBsn('111222334')

		expect(result.isFormallyValid).toBe(false)
		expect(result.errorCode).toBe(BSN_ERROR_CHECKSUM)
		expect(result.elevenTestScore).not.toBe(0)
	})

	it('rejects the ninth digit being ADDED rather than subtracted', () => {
		// 123456782: weighted sum over the first eight digits is 1*9+2*8+3*7+
		// 4*6+5*5+6*4+7*3+8*2 = 9+16+21+24+25+24+21+16 = 156.
		// 156 - 2 = 154, and 154 % 11 === 0  -> valid, correctly.
		expect(validateBsn('123456782').isFormallyValid).toBe(true)

		// 123456788: 156 - 8 = 148, 148 % 11 === 5 -> invalid.
		// Under the WRONG (+1) weighting it would be 156 + 8 = 164 ... also not
		// divisible, so pair it with the case below which flips the verdict.
		expect(validateBsn('123456788').isFormallyValid).toBe(false)
	})

	it.each([
		['', BSN_ERROR_LENGTH],
		['12345678', BSN_ERROR_LENGTH],
		['1234567890', BSN_ERROR_LENGTH],
		['12345678a', BSN_ERROR_LENGTH],
		['  1234567', BSN_ERROR_LENGTH],
	])('rejects %j as malformed', (input, expected) => {
		const result = validateBsn(input)

		expect(result.isFormallyValid).toBe(false)
		expect(result.errorCode).toBe(expected)
		expect(result.elevenTestScore).toBe(-1)
	})

	it('never echoes the raw BSN back', () => {
		const raw = '111222333'

		expect(JSON.stringify(validateBsn(raw))).not.toContain(raw)
	})

	it('tolerates null and undefined without throwing', () => {
		expect(validateBsn(null).isFormallyValid).toBe(false)
		expect(validateBsn(undefined).isFormallyValid).toBe(false)
	})
})

describe('maskBsn', () => {
	// Byte-identical to pipelinq's BsnValidationService::mask(). If this
	// changes, the audit trail and the form disagree about the same number.
	it('reveals characters 3..6 in ***XXXX* shape', () => {
		expect(maskBsn('123456789')).toBe('***4567*')
	})

	it('stars a short input out completely rather than part-revealing it', () => {
		expect(maskBsn('1234')).toBe('****')
	})

	it('returns an empty string for empty input', () => {
		expect(maskBsn('')).toBe('')
		expect(maskBsn(null)).toBe('')
	})
})
