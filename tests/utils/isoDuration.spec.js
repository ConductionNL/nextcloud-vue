/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-widgets-duration-and-subobject-table/tasks.md#task-1
 */
import { durationSeconds, formatDuration, isIsoDuration, parseDuration } from '../../src/utils/isoDuration.js'

describe('isoDuration', () => {
	it.each([
		['P56D', 56, 'days'],
		['P1W', 1, 'weeks'],
		['P10D', 10, 'days'],
		['PT90M', 90, 'minutes'],
		['PT4H', 4, 'hours'],
		['P1M', 1, 'months'],
		['P2Y', 2, 'years'],
	])('parses %s', (iso, amount, unit) => {
		expect(parseDuration(iso)).toEqual({ amount, unit })
		expect(formatDuration(amount, unit)).toBe(iso)
	})

	it('does not reduce a mixed value', () => {
		expect(parseDuration('P1DT2H')).toBeNull()
		expect(isIsoDuration('P1DT2H')).toBe(true)
	})

	it('rejects non-ISO text and empty amounts', () => {
		expect(isIsoDuration('56 days')).toBe(false)
		expect(isIsoDuration('P')).toBe(false)
		expect(formatDuration('', 'days')).toBeNull()
	})

	it('compares in seconds', () => {
		expect(durationSeconds('P1W')).toBe(durationSeconds('P7D'))
		expect(durationSeconds('PT90M')).toBeGreaterThan(durationSeconds('PT1H'))
	})
})
