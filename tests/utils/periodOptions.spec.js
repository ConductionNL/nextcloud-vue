/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A quarter page filter offers the current quarter first and the ones before
 * it, valued the way a quarterly report endpoint reads them.
 */

import { generatedPageFilterOptions, quarterKey, quarterOptions, yearOptions } from '../../src/utils/periodOptions.js'

describe('periodOptions', () => {
	const today = new Date(2026, 1, 15)

	it('names the quarter of a date', () => {
		expect(quarterKey(today)).toBe('2026-Q1')
		expect(quarterKey(new Date(2026, 11, 31))).toBe('2026-Q4')
	})

	it('offers the current quarter first and walks back across the year', () => {
		expect(quarterOptions(3, today)).toEqual([
			{ value: '2026-Q1', label: 'Q1 2026' },
			{ value: '2025-Q4', label: 'Q4 2025' },
			{ value: '2025-Q3', label: 'Q3 2025' },
		])
	})

	it('offers eight quarters by default', () => {
		expect(quarterOptions(undefined, today)).toHaveLength(8)
		expect(quarterOptions(0, today)).toHaveLength(8)
	})

	it('offers the current year first, five by default', () => {
		expect(yearOptions(2, today)).toEqual([{ value: '2026', label: '2026' }, { value: '2025', label: '2025' }])
		expect(yearOptions(undefined, today)).toHaveLength(5)
		expect(generatedPageFilterOptions({ type: 'year', count: 1 }, today)).toEqual([{ value: '2026', label: '2026' }])
	})

	it('generates options only for a quarter filter', () => {
		expect(generatedPageFilterOptions({ type: 'quarter', count: 2 }, today).map((o) => o.value)).toEqual(['2026-Q1', '2025-Q4'])
		expect(generatedPageFilterOptions({ type: 'select' }, today)).toBeNull()
		expect(generatedPageFilterOptions(null, today)).toBeNull()
	})
})
