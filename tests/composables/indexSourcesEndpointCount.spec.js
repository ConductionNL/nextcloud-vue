/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A quick filter with `showCount` on an endpoint page (DqPostvak) gets its
 * number from the endpoint source's `count(config)`: the same request with
 * the tab's filter, the total read at `totalPath` (`total` by default), else
 * the rows in the answer. CnIndexPage already counts a named source's tabs
 * through `count`; the endpoint source had none, so its tabs showed no number.
 */
const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => `/index.php${url}` }))

import { resolveIndexSource } from '../../src/composables/indexSources.js'

beforeEach(() => mockGet.mockReset())

describe('endpoint source count', () => {
	it('asks the endpoint with the tab\'s filter and reads the total', async () => {
		mockGet.mockResolvedValue({ data: { total: 12, results: [{ id: 'm1' }] } })
		const source = resolveIndexSource('endpoint')
		expect(await source.count({ url: '/apps/dossiq/api/postvak', channel: 'email', rowsPath: 'results' })).toBe(12)
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/dossiq/api/postvak', { params: { channel: 'email' } })
		expect(source.rows()).toEqual([])
	})

	it('reads the total at totalPath, else counts the rows', async () => {
		const source = resolveIndexSource('endpoint')
		mockGet.mockResolvedValueOnce({ data: { meta: { count: 7 }, items: [] } })
		expect(await source.count({ url: '/apps/x/api/y', totalPath: 'meta.count', rowsPath: 'items' })).toBe(7)
		mockGet.mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }, { id: 3 }] })
		expect(await source.count({ url: '/apps/x/api/y' })).toBe(3)
		mockGet.mockResolvedValueOnce({ data: { items: [{ id: 1 }] } })
		expect(await source.count({ url: '/apps/x/api/y', rowsPath: 'items' })).toBe(1)
	})

	it('asks nothing without a url, or with the page config in its place', async () => {
		const source = resolveIndexSource('endpoint')
		expect(await source.count({ channel: 'email' })).toBeNaN()
		expect(await source.count({ url: '/apps/x/api/y', entitySource: 'endpoint' })).toBeNaN()
		expect(mockGet).not.toHaveBeenCalled()
	})

	it('keeps the totalPath out of the load request too', async () => {
		mockGet.mockResolvedValue({ data: { results: [] } })
		const source = resolveIndexSource('endpoint')
		await source.load({ url: '/apps/x/api/y', totalPath: 'meta.count', match: 'none' })
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/x/api/y', { params: { match: 'none' } })
	})
})
