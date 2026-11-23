/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A days input can be set as a date (`dateField`): the date shown is today
 * plus the days, and a chosen date sets the days to the whole days from
 * today, at least 1 (DqVolgendeStap "De zaak komt terug op").
 *
 * @spec openspec/changes/days-input-as-date/specs/transition-inputs/spec.md
 */
import { dayAfterIso, daysUntilIso, resolveInputFields } from '../../src/utils/transitionInputs.js'

const NOW = new Date(2026, 9, 7, 15, 30)

describe('dayAfterIso', () => {
	it('is today plus the days, as yyyy-mm-dd', () => {
		expect(dayAfterIso('14', NOW)).toBe('2026-10-21')
	})

	it('is empty for no days or less than one', () => {
		expect(dayAfterIso('', NOW)).toBe('')
		expect(dayAfterIso('0', NOW)).toBe('')
	})
})

describe('daysUntilIso', () => {
	it('counts whole days from today', () => {
		expect(daysUntilIso('2026-10-21', NOW)).toBe('14')
	})

	it('is at least 1, for today or a day in the past', () => {
		expect(daysUntilIso('2026-10-07', NOW)).toBe('1')
		expect(daysUntilIso('2026-09-01', NOW)).toBe('1')
	})

	it('is empty for no date', () => {
		expect(daysUntilIso('', NOW)).toBe('')
		expect(daysUntilIso('not a date', NOW)).toBe('')
	})
})

describe('resolveInputFields with dateField', () => {
	const inputs = [{ field: 'days', widget: 'number', label: 'Days', dateField: { label: 'Comes back on', note: 'Earlier if answered.' } }]

	it('carries the date the days give', () => {
		const [days] = resolveInputFields(inputs, { values: { days: '14' }, now: NOW })
		expect(days.dateValue).toBe('2026-10-21')
	})

	it('carries an empty date without days', () => {
		const [days] = resolveInputFields(inputs, { values: {}, now: NOW })
		expect(days.dateValue).toBe('')
	})
})
