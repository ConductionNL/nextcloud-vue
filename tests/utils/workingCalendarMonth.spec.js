/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The weeks of a month, Monday first, with the working weekdays and closures.
 *
 * @spec openspec/changes/working-calendar-widget/specs/working-calendar-widget/spec.md
 */
import { buildMonth, normaliseExceptions } from '../../src/utils/workingCalendarMonth.js'

describe('buildMonth', () => {
	it('lays December 2026 out Monday first, a Tuesday start, with the weekend off and closures marked', () => {
		const closures = new Map([['2026-12-25', { name: 'Christmas Day', kind: 'holiday' }]])
		const weeks = buildMonth(2026, 11, { workingWeekdays: [1, 2, 3, 4, 5], closures, today: '2026-12-01' })
		expect(weeks[0][0]).toBeNull()
		expect(weeks[0][1]).toEqual(expect.objectContaining({ date: '2026-12-01', weekday: 2, working: true, today: true }))
		expect(weeks[0][5]).toEqual(expect.objectContaining({ date: '2026-12-05', working: false, closure: null }))
		const christmas = weeks.flat().find((d) => d && d.date === '2026-12-25')
		expect(christmas).toEqual(expect.objectContaining({ weekday: 5, working: false, closure: { name: 'Christmas Day', kind: 'holiday' } }))
		expect(weeks.every((w) => w.length === 7)).toBe(true)
		expect(weeks.flat().filter(Boolean)).toHaveLength(31)
	})

	it("follows the calendar's own working weekdays", () => {
		const weeks = buildMonth(2026, 1, { workingWeekdays: [1, 2, 3, 4] })
		expect(weeks.flat().find((d) => d && d.date === '2026-02-06').working).toBe(false)
		expect(weeks.flat().find((d) => d && d.date === '2026-02-02').working).toBe(true)
	})
})

describe('normaliseExceptions', () => {
	it('takes date strings and { date, name } objects and drops anything else', () => {
		expect(normaliseExceptions(['2026-12-24', { date: '2026-12-31', name: 'Year end' }, { name: 'x' }, 'bad', null]))
			.toEqual([{ date: '2026-12-24', name: '' }, { date: '2026-12-31', name: 'Year end' }])
	})
})
