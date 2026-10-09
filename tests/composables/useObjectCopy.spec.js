/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/index-copy-with-relations/tasks.md#task-1
 */
import axios from '@nextcloud/axios'
import { copyKindsOf, useObjectCopy } from '../../src/composables/useObjectCopy.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), options: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}` }))

const source = { register: 'stack', schema: 'application', id: 'A1' }
const BASE = '/index.php/apps/openregister/api/objects/stack/application/A1'

beforeEach(() => {
	jest.clearAllMocks()
})

describe('copyKindsOf', () => {
	it('keeps the known kinds once and drops the rest', () => {
		expect(copyKindsOf(['incoming', 'files', 'incoming', 'nonsense'])).toEqual(['incoming', 'files'])
		expect(copyKindsOf(undefined)).toEqual([])
	})
})

describe('useObjectCopy', () => {
	it('links reads only the included kinds, titles first and a count', async () => {
		axios.get.mockImplementation(async (url) => {
			if (url.endsWith('/used')) {
				return { data: { results: Array.from({ length: 12 }, (_, i) => ({ id: `o${i}`, title: `Org ${i}` })), total: 12 } }
			}
			return { data: { results: [{ id: 'c1', name: 'Link 1' }], total: 1 } }
		})
		const out = await useObjectCopy().links(source, ['incoming', 'relationRows'])
		expect(axios.get.mock.calls.map((c) => c[0])).toEqual([`${BASE}/used`, `${BASE}/relation-rows`])
		expect(out.incoming.total).toBe(12)
		expect(out.incoming.titles).toHaveLength(10)
		expect(out.relationRows).toEqual({ titles: ['Link 1'], total: 1 })
		expect(out.files).toBeUndefined()
	})

	it('a kind that cannot be read counts as nothing', async () => {
		axios.get.mockRejectedValue(new Error('403'))
		expect(await useObjectCopy().links(source, ['files'])).toEqual({ files: { titles: [], total: 0 } })
	})

	it('copy posts once with the name and the kinds, and returns the object and the per-link outcome', async () => {
		axios.post.mockResolvedValue({ data: { object: { id: 'A2', title: 'Zaaksysteem X (kopie)' }, links: [{ kind: 'incoming', title: 'Org 3', ok: false, reason: 'not allowed' }] } })
		const out = await useObjectCopy().copy(source, 'Zaaksysteem X (kopie)', ['incoming', 'bogus'], { title: 'Zaaksysteem X (kopie)' })
		expect(axios.post).toHaveBeenCalledTimes(1)
		expect(axios.post).toHaveBeenCalledWith(`${BASE}/copy`, { name: 'Zaaksysteem X (kopie)', overrides: { title: 'Zaaksysteem X (kopie)' }, include: ['incoming'] })
		expect(out.object.id).toBe('A2')
		expect(out.links[0]).toMatchObject({ ok: false, reason: 'not allowed' })
	})

	it('available answers false for a 404 and a 405, true otherwise', async () => {
		axios.options.mockRejectedValueOnce({ response: { status: 404 } })
		expect(await useObjectCopy().available(source)).toBe(false)
		axios.options.mockRejectedValueOnce({ response: { status: 405 } })
		expect(await useObjectCopy().available(source)).toBe(false)
		axios.options.mockResolvedValueOnce({})
		expect(await useObjectCopy().available(source)).toBe(true)
		axios.options.mockRejectedValueOnce({ response: { status: 403 } })
		expect(await useObjectCopy().available(source)).toBe(true)
	})
})
