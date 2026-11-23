/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A date's ISO 8601 week, for `{path|week}` (DqTermijnen "Week 41").
 *
 * @spec openspec/changes/description-today-week/specs/description-today-week/spec.md#requirement-a-template-can-name-a-dates-week-and-a-dashboard-description-can-read-today
 */
const { isoWeek } = require('../../src/utils/boardDate.js')
const { fillTemplate } = require('../../src/utils/fillTemplate.js')

describe('isoWeek', () => {
	it('numbers the weeks as ISO 8601 does', () => {
		expect(isoWeek(new Date(2026, 9, 7))).toBe(41)
		expect(isoWeek(new Date(2026, 0, 1))).toBe(1)
		expect(isoWeek(new Date(2027, 0, 1))).toBe(53)
		expect(isoWeek(new Date(2024, 11, 30))).toBe(1)
	})

	it('is a template format', () => {
		expect(fillTemplate('{at|week}', { at: new Date(2026, 9, 7, 12).toISOString() })).toBe('Week 41')
		expect(fillTemplate('{at|week}', { at: 'no date' })).toBe('')
	})
})
