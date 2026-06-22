/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { rowsToFilter, filterToRows } from '../../src/components/CnFilterRowsEditor/filterRows.js'

describe('filterRows', () => {
	it('serialises an equality row to a bare filter value', () => {
		expect(rowsToFilter([{ key: 'status', op: 'eq', value: 'won' }])).toEqual({ status: 'won' })
	})

	it('serialises an operator row to a nested filter', () => {
		expect(rowsToFilter([{ key: 'value', op: 'gt', value: '30000' }])).toEqual({ value: { gt: '30000' } })
	})

	it('merges two operator rows on the same field into a range', () => {
		const rows = [
			{ key: 'date', op: 'gte', value: '2026-01-01' },
			{ key: 'date', op: 'lte', value: '2026-12-31' },
		]
		expect(rowsToFilter(rows)).toEqual({ date: { gte: '2026-01-01', lte: '2026-12-31' } })
	})

	it('skips rows with an empty key', () => {
		expect(rowsToFilter([{ key: '', op: 'eq', value: 'x' }])).toEqual({})
	})

	it('round-trips a mixed filter back to rows', () => {
		const filter = { status: 'won', value: { gt: '30000' } }
		const rows = filterToRows(filter)
		expect(rows).toEqual([
			{ key: 'status', op: 'eq', value: 'won' },
			{ key: 'value', op: 'gt', value: '30000' },
		])
		expect(rowsToFilter(rows)).toEqual(filter)
	})
})
