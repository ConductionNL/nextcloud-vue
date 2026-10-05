// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

import { daysUntil, dueStateForRow, dueStateOf, toLocalDay } from '../../src/utils/dueRule.js'

const now = new Date(2026, 9, 5, 14, 30) // 5 Oct 2026, mid afternoon

describe('dueRule', () => {
	it('reads a bare date as a local day, not as UTC', () => {
		const day = toLocalDay('2026-11-01')
		expect([day.getFullYear(), day.getMonth(), day.getDate(), day.getHours()]).toEqual([2026, 10, 1, 0])
	})

	it('returns null for a value that is not a date', () => {
		expect(toLocalDay('')).toBeNull()
		expect(toLocalDay(null)).toBeNull()
		expect(toLocalDay('soon')).toBeNull()
		expect(daysUntil('nope', now)).toBeNull()
	})

	it('counts whole calendar days, whatever the time of day', () => {
		expect(daysUntil('2026-10-05', now)).toBe(0)
		expect(daysUntil('2026-10-06', now)).toBe(1)
		expect(daysUntil('2026-10-04', now)).toBe(-1)
		expect(daysUntil(new Date(2026, 9, 5, 23, 59), now)).toBe(0)
	})

	it('marks a date before today overdue', () => {
		expect(dueStateOf('2026-10-04', {}, now)).toBe('overdue')
	})

	it('marks today and the next three days soon by default', () => {
		expect(dueStateOf('2026-10-05', {}, now)).toBe('soon')
		expect(dueStateOf('2026-10-08', {}, now)).toBe('soon')
		expect(dueStateOf('2026-10-09', {}, now)).toBe('ok')
	})

	it('honours soonDays, including zero', () => {
		expect(dueStateOf('2026-10-12', { soonDays: 7 }, now)).toBe('soon')
		expect(dueStateOf('2026-10-06', { soonDays: 0 }, now)).toBe('ok')
		expect(dueStateOf('2026-10-05', { soonDays: 0 }, now)).toBe('soon')
	})

	it('takes a variantWhen list in the table date cell shape, and then ignores soonDays', () => {
		const rule = { soonDays: 30, variantWhen: [{ op: 'lt', value: 0, variant: 'error' }, { op: 'lte', value: 1, variant: 'warning' }] }
		expect(dueStateOf('2026-10-04', rule, now)).toBe('overdue')
		expect(dueStateOf('2026-10-06', rule, now)).toBe('soon')
		expect(dueStateOf('2026-10-08', rule, now)).toBe('ok')
	})

	it('reads the date off the row through the rule field, dot-paths included', () => {
		expect(dueStateForRow({ deadline: '2026-10-01' }, { field: 'deadline' }, now)).toBe('overdue')
		expect(dueStateForRow({ term: { end: '2026-12-01' } }, { field: 'term.end' }, now)).toBe('ok')
	})

	it('marks nothing without a rule, a field or a date', () => {
		expect(dueStateForRow({ deadline: '2026-10-01' }, null, now)).toBeNull()
		expect(dueStateForRow({ deadline: '2026-10-01' }, {}, now)).toBeNull()
		expect(dueStateForRow({}, { field: 'deadline' }, now)).toBeNull()
	})
})
