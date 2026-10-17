/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The endpoint index source (index-endpoint-source): an index page lists rows
 * from an app's own endpoint, with the endpoint's own authorization (DqPostvak).
 *
 * @spec openspec/changes/index-endpoint-source/specs/index-page/spec.md#requirement-an-index-page-can-list-rows-from-an-app-endpoint
 */
const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => `/index.php${url}` }))

import { resolveIndexSource } from '../../src/composables/indexSources.js'

beforeEach(() => mockGet.mockReset())

describe('endpoint index source', () => {
	it('is registered as "endpoint"', () => {
		expect(resolveIndexSource('endpoint')).not.toBeNull()
	})

	it('fetches the app path with the other config keys as query parameters', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ id: 'm1' }, { id: 'm2' }] } })
		const source = resolveIndexSource('endpoint')
		await source.load({ url: '/apps/dossiq/api/postvak', channel: ['email', 'portal'], match: 'none', empty: '' })
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/dossiq/api/postvak', { params: { channel: 'email,portal', match: 'none' } })
		expect(source.rows().map((row) => row.id)).toEqual(['m1', 'm2'])
		expect(source.loading()).toBe(false)
	})

	it('reads rows from rowsPath, or a bare array', async () => {
		const source = resolveIndexSource('endpoint')
		mockGet.mockResolvedValue({ data: { data: { items: [{ id: 'a' }] } } })
		await source.load({ url: '/apps/x/api/y', rowsPath: 'data.items' })
		expect(source.rows()).toEqual([{ id: 'a' }])
		mockGet.mockResolvedValue({ data: [{ id: 'b' }] })
		await source.load({ url: '/apps/x/api/y' })
		expect(source.rows()).toEqual([{ id: 'b' }])
	})

	it('leaves no rows and rethrows on a failed request, and loads nothing without a url', async () => {
		const source = resolveIndexSource('endpoint')
		mockGet.mockRejectedValue(new Error('403'))
		await expect(source.load({ url: '/apps/x/api/y' })).rejects.toThrow('403')
		expect(source.rows()).toEqual([])
		mockGet.mockReset()
		await source.load({})
		expect(mockGet).not.toHaveBeenCalled()
	})
})
