/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * dateVariant: days until a date, and the variant the rules give it.
 *
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-avatar-and-date-cells
 */

import { dayKey, daysUntil, parseDateValue, resolveDateVariant } from '../../src/utils/dateVariant.js'

const NOW = new Date(2026, 9, 5, 14, 30) // Monday 5 October 2026, 14:30 local

const RULES = [
	{ op: 'lt', value: 0, variant: 'error' },
	{ op: 'lte', value: 5, variant: 'warning' },
]

describe('parseDateValue', () => {
	it('reads a date-only string as a local day', () => {
		const date = parseDateValue('2026-10-05')
		expect(date.getFullYear()).toBe(2026)
		expect(date.getMonth()).toBe(9)
		expect(date.getDate()).toBe(5)
		expect(date.getHours()).toBe(0)
	})

	it('returns null for what is not a date', () => {
		expect(parseDateValue('')).toBeNull()
		expect(parseDateValue(null)).toBeNull()
		expect(parseDateValue('not a date')).toBeNull()
		expect(parseDateValue({})).toBeNull()
	})

	it('passes a valid Date through and rejects an invalid one', () => {
		expect(parseDateValue(NOW)).toBe(NOW)
		expect(parseDateValue(new Date('nope'))).toBeNull()
	})
})

describe('dayKey', () => {
	it('writes the local day as YYYY-MM-DD', () => {
		expect(dayKey(new Date(2026, 0, 9))).toBe('2026-01-09')
	})
})

describe('daysUntil', () => {
	it('is 0 today, whatever the time of day', () => {
		expect(daysUntil('2026-10-05', NOW)).toBe(0)
		expect(daysUntil(new Date(2026, 9, 5, 23, 59), NOW)).toBe(0)
	})

	it('is negative for a past day and positive for a coming one', () => {
		expect(daysUntil('2026-10-04', NOW)).toBe(-1)
		expect(daysUntil('2026-10-08', NOW)).toBe(3)
	})

	it('counts calendar days across a daylight-saving change', () => {
		// The clocks go back on 25 October 2026 in Europe: that day has 25 hours.
		expect(daysUntil('2026-10-26', new Date(2026, 9, 24, 12))).toBe(2)
	})

	it('is null when the value is not a date', () => {
		expect(daysUntil('', NOW)).toBeNull()
	})
})

describe('resolveDateVariant', () => {
	it('marks an overdue date as error', () => {
		expect(resolveDateVariant('2026-10-01', RULES, NOW)).toBe('error')
	})

	it('marks a date within five days as warning, today included', () => {
		expect(resolveDateVariant('2026-10-05', RULES, NOW)).toBe('warning')
		expect(resolveDateVariant('2026-10-10', RULES, NOW)).toBe('warning')
	})

	it('gives no variant to a date further away', () => {
		expect(resolveDateVariant('2026-10-11', RULES, NOW)).toBe('')
	})

	it('lets the first matching rule win', () => {
		const rules = [{ op: 'lte', value: 5, variant: 'warning' }, { op: 'lt', value: 0, variant: 'error' }]
		expect(resolveDateVariant('2026-10-01', rules, NOW)).toBe('warning')
	})

	it('accepts danger as an alias of error and drops an unknown variant', () => {
		expect(resolveDateVariant('2026-10-01', [{ op: 'lt', value: 0, variant: 'danger' }], NOW)).toBe('error')
		expect(resolveDateVariant('2026-10-01', [{ op: 'lt', value: 0, variant: 'purple' }], NOW)).toBe('')
	})

	it('gives no variant without rules or without a date', () => {
		expect(resolveDateVariant('2026-10-01', [], NOW)).toBe('')
		expect(resolveDateVariant('2026-10-01', null, NOW)).toBe('')
		expect(resolveDateVariant('', RULES, NOW)).toBe('')
	})
})
