/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/screens-stats-block-operator-keys/specs/stats-block/spec.md#requirement-a-stats-block-filter-can-spell-its-operator-in-the-key
 */
import { aggFilterParam, flattenAggFilter } from '../../src/utils/fetchAggregate.js'

describe('aggFilterParam', () => {
	it('nests an operator spelled in the key, and leaves a plain key alone', () => {
		expect(aggFilterParam('meetingDate[gte]')).toBe('filter[meetingDate][gte]')
		expect(aggFilterParam('a.b[lt]')).toBe('filter[a.b][lt]')
		expect(aggFilterParam('status')).toBe('filter[status]')
	})

	it('flattenAggFilter sends flat and nested operators the same way', () => {
		const flat = {}
		const nested = {}
		flattenAggFilter(flat, { 'meetingDate[gte]': '2026-01-01' })
		flattenAggFilter(nested, { meetingDate: { gte: '2026-01-01' } })
		expect(flat).toEqual({ 'filter[meetingDate][gte]': '2026-01-01' })
		expect(flat).toEqual(nested)
	})
	it('names a metadata field as the aggregation endpoint does (`@self[updated]` is `_updated`)', () => {
		expect(aggFilterParam('@self[updated][lt]')).toBe('filter[_updated][lt]')
		expect(aggFilterParam('@self.created')).toBe('filter[_created]')
		const nested = {}
		flattenAggFilter(nested, { '@self.updated': { lt: '2026-10-14' } })
		expect(nested).toEqual({ 'filter[_updated][lt]': '2026-10-14' })
	})
})
