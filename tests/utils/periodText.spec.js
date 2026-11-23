/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A page filter's active choice read as a period, for a dashboard
 * description (DqProcesanalyse "Afgehandelde zaken januari tot en met
 * september 2026").
 *
 * @spec openspec/changes/description-period-from-filter/specs/description-period-from-filter/spec.md#requirement-a-dashboard-description-reads-the-active-period-of-a-page-filter
 */
import { periodText } from '../../src/utils/periodOptions.js'

describe('periodText', () => {
	const today = new Date(2026, 9, 7)

	it('reads a months window as its months, the current one last', () => {
		expect(periodText({ value: '12m', label: 'Last 12 months', months: 12 }, today)).toBe('November 2025 through October 2026')
		expect(periodText({ value: '9m', months: 9 }, new Date(2026, 8, 30))).toBe('January through September 2026')
		expect(periodText({ value: '1m', months: 1 }, today)).toBe('October 2026')
	})

	it('reads a quarter as its months and a year as the year', () => {
		expect(periodText({ value: '2026-Q3', label: 'Q3 2026' }, today)).toBe('July through September 2026')
		expect(periodText({ value: '2025', label: '2025' }, today)).toBe('2025')
	})

	it('reads any other option as its label, and nothing as empty', () => {
		expect(periodText({ value: 'all', label: 'All time' }, today)).toBe('All time')
		expect(periodText(null, today)).toBe('')
	})
})
