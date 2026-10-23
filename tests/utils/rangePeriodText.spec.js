/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard's active date range read as a period, for a dashboard
 * description (DqDashboard "Hoe het team ervoor staat · oktober 2026").
 *
 * @spec openspec/changes/description-period-from-date-range/specs/description-period-from-date-range/spec.md#requirement-a-dashboard-description-reads-the-active-date-range-as-a-period
 */
import { rangePeriodText } from '../../src/utils/periodOptions.js'

const at = (y, m, d) => new Date(y, m, d).toISOString()

describe('rangePeriodText', () => {
	it('reads a calendar month, quarter and year as the period', () => {
		expect(rangePeriodText({ from: at(2026, 9, 1), to: at(2026, 9, 7), preset: 'month' }, { id: 'month', period: 'month' })).toBe('October 2026')
		expect(rangePeriodText({ from: at(2026, 6, 1), to: at(2026, 7, 14), preset: 'quarter' }, { id: 'quarter', period: 'quarter' })).toBe('July through September 2026')
		expect(rangePeriodText({ from: at(2026, 0, 1), to: at(2026, 9, 7), preset: 'year' }, { id: 'year', period: 'year' })).toBe('2026')
	})

	it('reads any other preset as its label', () => {
		expect(rangePeriodText({ from: null, to: null, preset: 'all' }, { id: 'all', label: 'All' })).toBe('All')
	})

	it('reads nothing as empty', () => {
		expect(rangePeriodText(null, null)).toBe('')
		expect(rangePeriodText({ from: null, to: null, preset: 'custom' }, null)).toBe('')
	})
})
