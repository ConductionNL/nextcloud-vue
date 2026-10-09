/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A type registered with a `collectionUrl` lists from that endpoint; every
 * other call keeps the register/schema URL.
 */
import { createPinia, setActivePinia } from 'pinia'
import { createObjectStore } from '../../src/store/useObjectStore.js'

const ok = (body) => ({ ok: true, status: 200, json: async () => body })

describe('useObjectStore: collectionUrl', () => {
	let store

	beforeEach(() => {
		setActivePinia(createPinia())
		store = createObjectStore('collection-store')()
		global.fetch = jest.fn()
	})

	afterEach(() => {
		jest.restoreAllMocks()
		delete global.fetch
	})

	it('lists from the collection URL with _order in bracket form', async () => {
		store.registerObjectType('pubs', '24', '19', { collectionUrl: '/apps/opencatalogi/api/cat' })
		global.fetch.mockResolvedValue(ok({ results: [{ id: 'a' }, { id: 'b' }], total: 8, page: 2, pages: 4 }))

		const rows = await store.fetchCollection('pubs', { _page: 2, _limit: 2, _search: 'x', _order: { '@self.created': 'desc' } })

		const url = decodeURIComponent(global.fetch.mock.calls[0][0])
		expect(url).toContain('/apps/opencatalogi/api/cat?')
		expect(url).toContain('_page=2')
		expect(url).toContain('_search=x')
		expect(url).toContain('_order[@self.created]=desc')
		expect(url).not.toContain('/api/objects/')
		expect(rows).toHaveLength(2)
		expect(store.getPagination('pubs')).toMatchObject({ total: 8, page: 2, pages: 4 })
	})

	it('joins with & when the collection URL already has a query', async () => {
		store.registerObjectType('pubs', '24', '19', { collectionUrl: '/apps/x/api/cat?scope=all' })
		global.fetch.mockResolvedValue(ok({ results: [] }))

		await store.fetchCollection('pubs', { _page: 1 })

		expect(global.fetch.mock.calls[0][0]).toMatch(/\/apps\/x\/api\/cat\?scope=all&_page=1/)
	})

	it('keeps the register/schema URL for writes and schema reads', async () => {
		store.registerObjectType('pubs', '24', '19', { collectionUrl: '/apps/opencatalogi/api/cat' })
		global.fetch.mockResolvedValue({ ok: true, status: 204, json: async () => ({}) })

		await store.deleteObject('pubs', 'abc')

		expect(global.fetch.mock.calls[0][0]).toContain('/api/objects/19/24/abc')
	})

	it('leaves a type without collectionUrl unchanged', async () => {
		store.registerObjectType('plain', '24', '19', { registerSlug: '19', schemaSlug: '24' })
		global.fetch.mockResolvedValue(ok({ results: [] }))

		await store.fetchCollection('plain', { _page: 1 })

		expect(store.objectTypeRegistry.plain).not.toHaveProperty('collectionUrl')
		expect(global.fetch.mock.calls[0][0]).toContain('/api/objects/19/24')
	})
})
