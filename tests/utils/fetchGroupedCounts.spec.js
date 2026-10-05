/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * fetchGroupedCounts: one request to OpenRegister's grouped aggregation.
 *
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-stacked-bar-widget
 */

import axios from '@nextcloud/axios'
import { fetchGroupedCounts } from '../../src/utils/fetchAggregate.js'

jest.mock('@nextcloud/router', () => ({
	generateUrl: (path, params = {}) => Object.entries(params).reduce((url, [key, value]) => url.replace(`{${key}}`, value), path),
}))

describe('fetchGroupedCounts', () => {
	afterEach(() => {
		jest.restoreAllMocks()
	})

	it('asks for the count per value of the group field, with the filter flattened', async () => {
		const get = jest.spyOn(axios, 'get').mockResolvedValue({
			data: { groups: [{ key: 'open', value: 12 }, { key: null, value: 2 }, { key: 'closed', value: '30' }] },
		})

		const groups = await fetchGroupedCounts({
			register: 'dossiq',
			schema: 'case',
			groupBy: 'status',
			filter: { type: 'woo', deadline: { lt: '2026-10-05' } },
		})

		expect(get).toHaveBeenCalledTimes(1)
		expect(get.mock.calls[0][0]).toBe('/apps/openregister/api/objects/aggregations/dossiq/case/grouped')
		expect(get.mock.calls[0][1].params).toEqual({
			groupBy: 'status',
			metric: 'count',
			'filter[type]': 'woo',
			'filter[deadline][lt]': '2026-10-05',
		})
		// The group without a key is dropped, and a numeric string is a number.
		expect(groups).toEqual([{ key: 'open', count: 12 }, { key: 'closed', count: 30 }])
	})

	it('makes no request for an incomplete source', async () => {
		const get = jest.spyOn(axios, 'get')
		expect(await fetchGroupedCounts({ register: 'r', schema: 's' })).toEqual([])
		expect(await fetchGroupedCounts(null)).toEqual([])
		expect(get).not.toHaveBeenCalled()
	})

	it('returns an empty list when the response has no groups', async () => {
		jest.spyOn(axios, 'get').mockResolvedValue({ data: {} })
		expect(await fetchGroupedCounts({ register: 'r', schema: 's', groupBy: 'f' })).toEqual([])
	})
})
