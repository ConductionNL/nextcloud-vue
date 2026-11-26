/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An app's own object store and the library's list view each read the page's
 * schema at boot, one right after the other. Stores of one pinia share a schema
 * read for a few seconds; each still keeps its own copy, a failed read is not
 * shared, and a later read asks the API again.
 */
import { createPinia, setActivePinia } from 'pinia'
import { createObjectStore } from '../../src/store/useObjectStore.js'

const ok = (body) => ({ ok: true, status: 200, json: async () => body })
const schema = { id: 41, title: 'Catalog', properties: {} }

/**
 * A store with the `catalog` type registered on register 26, schema 41.
 *
 * @param {string} id Store id.
 * @return {object} The store.
 */
function storeWithCatalog(id) {
	const store = createObjectStore(id)()
	store.registerObjectType('catalog', '41', '26')
	return store
}

describe('useObjectStore: schema reads shared between stores', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		global.fetch = jest.fn()
	})

	afterEach(() => {
		jest.useRealTimers()
		jest.restoreAllMocks()
		delete global.fetch
	})

	it('answers a second store from the first read, and both keep the schema', async () => {
		global.fetch.mockResolvedValue(ok(schema))
		const app = storeWithCatalog('app-store')
		const list = storeWithCatalog('list-store')

		expect(await app.fetchSchema('catalog')).toEqual(schema)
		expect(await list.fetchSchema('catalog')).toEqual(schema)

		expect(global.fetch).toHaveBeenCalledTimes(1)
		expect(global.fetch.mock.calls[0][0]).toContain('/api/schemas/41?register=26')
		expect(app.schemas.catalog).toEqual(schema)
		expect(list.schemas.catalog).toEqual(schema)
	})

	it('shares a read still in flight', async () => {
		global.fetch.mockResolvedValue(ok(schema))
		const [a, b] = await Promise.all([
			storeWithCatalog('one').fetchSchema('catalog'),
			storeWithCatalog('two').fetchSchema('catalog'),
		])
		expect(a).toEqual(schema)
		expect(b).toEqual(schema)
		expect(global.fetch).toHaveBeenCalledTimes(1)
	})

	it('reads again once the shared answer is a few seconds old', async () => {
		jest.useFakeTimers({ now: 1_000_000, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] })
		global.fetch.mockResolvedValue(ok(schema))
		await storeWithCatalog('early').fetchSchema('catalog')

		jest.setSystemTime(1_000_000 + 6000)
		await storeWithCatalog('later').fetchSchema('catalog')

		expect(global.fetch).toHaveBeenCalledTimes(2)
	})

	it('does not share a failed read', async () => {
		global.fetch
			.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Error', text: async () => '', json: async () => ({}) })
			.mockResolvedValueOnce(ok(schema))

		expect(await storeWithCatalog('failing').fetchSchema('catalog')).toBeNull()
		expect(await storeWithCatalog('retrying').fetchSchema('catalog')).toEqual(schema)
		expect(global.fetch).toHaveBeenCalledTimes(2)
	})

	it('does not share between two pinia instances', async () => {
		global.fetch.mockResolvedValue(ok(schema))
		await storeWithCatalog('first-app').fetchSchema('catalog')

		setActivePinia(createPinia())
		await storeWithCatalog('second-app').fetchSchema('catalog')

		expect(global.fetch).toHaveBeenCalledTimes(2)
	})
})
