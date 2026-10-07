// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * `useListView`'s `error` against the REAL object store, with responses
 * settling out of order. The store clears `errors[type]` when a request starts
 * and never on success, so the shared map cannot say which request failed: an
 * older failure that lands between a newer request's start and its success
 * stays on it. `error` must follow the latest refresh's own response.
 */

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { useListView } from '../../src/composables/useListView.js'
import { createObjectStore } from '../../src/store/useObjectStore.js'

const flush = () => new Promise((resolve) => setTimeout(resolve))

/**
 * @return {{promise: Promise, resolve: Function}} A response the test settles by hand.
 */
function deferred() {
	let resolve
	const promise = new Promise((r) => {
		resolve = r
	})
	return { promise, resolve }
}

/**
 * @param {Array<object>} rows The rows returned.
 * @return {object} A 200 response.
 */
function okResponse(rows) {
	return {
		ok: true,
		status: 200,
		headers: { get: () => 'application/json' },
		json: () => Promise.resolve({ results: rows, total: rows.length, page: 1, pages: 1 }),
		text: () => Promise.resolve(''),
	}
}

/**
 * @return {object} A 400 response, as OpenRegister answers a search term it cannot parse.
 */
function badResponse() {
	return {
		ok: false,
		status: 400,
		statusText: 'Bad Request',
		headers: { get: () => 'application/json' },
		json: () => Promise.resolve({ message: 'Invalid search query' }),
		text: () => Promise.resolve('{"message":"Invalid search query"}'),
		clone() {
			return this
		},
	}
}

/**
 * Mount a host exposing `useListView('t')` over a fresh real store whose
 * first fetch succeeds.
 *
 * @return {Promise<{store: object, list: object}>} The store and the composable.
 */
async function setup() {
	setActivePinia(createPinia())
	const store = createObjectStore('race-store')()
	store.registerObjectType('t', 'schema-id', 'register-id')
	global.fetch = jest.fn().mockResolvedValue(okResponse([{ id: 'first' }]))
	const Comp = defineComponent({
		setup() {
			return { list: useListView('t', { objectStore: store }) }
		},
		render() {
			return h('div')
		},
	})
	const w = mount(Comp)
	await flush()
	return { store, list: w.vm.list }
}

beforeEach(() => {
	jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
	console.error.mockRestore()
})

describe('useListView error with the real store', () => {
	it('ignores an older failure that settles between a newer start and its success', async () => {
		const { store, list } = await setup()
		expect(list.error.value).toBeNull()

		const older = deferred()
		const newer = deferred()
		global.fetch = jest.fn()
			.mockImplementationOnce(() => older.promise)
			.mockImplementationOnce(() => newer.promise)

		list.searchTerm.value = 'verzoek (2026'
		const pOlder = list.refresh(1)
		list.searchTerm.value = 'verzoek 2026'
		const pNewer = list.refresh(1)
		older.resolve(badResponse())
		await pOlder
		newer.resolve(okResponse([{ id: 'b' }]))
		await pNewer
		await flush()

		// The store's shared map still holds the older failure ...
		expect(store.errors.t).not.toBeNull()
		// ... but the latest refresh succeeded.
		expect(list.error.value).toBeNull()
		expect(list.objects.value).toEqual([{ id: 'b' }])
	})

	it('keeps a newer failure when an older success settles after it', async () => {
		const { list } = await setup()

		const older = deferred()
		const newer = deferred()
		global.fetch = jest.fn()
			.mockImplementationOnce(() => older.promise)
			.mockImplementationOnce(() => newer.promise)

		list.searchTerm.value = 'verzoek'
		const pOlder = list.refresh(1)
		list.searchTerm.value = 'verzoek (2026'
		const pNewer = list.refresh(1)
		newer.resolve(badResponse())
		await pNewer
		older.resolve(okResponse([{ id: 'old' }]))
		await pOlder
		await flush()

		expect(list.error.value).toMatchObject({ status: 400 })
	})

	it('reports the shared request\'s result to every caller deduplicated onto it', async () => {
		const { store, list } = await setup()
		store.__liveDedupActive = true

		const shared = deferred()
		const other = deferred()
		global.fetch = jest.fn()
			.mockImplementationOnce(() => shared.promise)
			.mockImplementationOnce(() => other.promise)

		// A (failing) and C share one request; B, with other params, succeeds
		// in between. C is the latest refresh, so A's failure is C's own.
		list.searchTerm.value = 'verzoek (2026'
		const pA = list.refresh(1)
		list.searchTerm.value = 'verzoek'
		const pB = list.refresh(1)
		list.searchTerm.value = 'verzoek (2026'
		const pC = list.refresh(1)
		expect(global.fetch).toHaveBeenCalledTimes(2)

		other.resolve(okResponse([{ id: 'b' }]))
		await pB
		shared.resolve(badResponse())
		await Promise.all([pA, pC])
		await flush()
		expect(list.error.value).toMatchObject({ status: 400 })

		// A same-params duplicate that succeeds clears it for every caller.
		const again = deferred()
		global.fetch = jest.fn().mockImplementationOnce(() => again.promise)
		const p1 = list.refresh(1)
		const p2 = list.refresh(1)
		expect(global.fetch).toHaveBeenCalledTimes(1)
		again.resolve(okResponse([{ id: 'c' }]))
		await Promise.all([p1, p2])
		expect(list.error.value).toBeNull()
	})

	it('gives a deduplicated caller its shared request\'s success over another request\'s failure', async () => {
		const { store, list } = await setup()
		store.__liveDedupActive = true

		const shared = deferred()
		const other = deferred()
		global.fetch = jest.fn()
			.mockImplementationOnce(() => shared.promise)
			.mockImplementationOnce(() => other.promise)

		// A starts; B (other params) starts and clears the shared error; C
		// joins A without starting a request. B fails, then A succeeds: C,
		// the latest refresh, got A's success.
		list.searchTerm.value = 'verzoek'
		const pA = list.refresh(1)
		list.searchTerm.value = 'verzoek (2026'
		const pB = list.refresh(1)
		list.searchTerm.value = 'verzoek'
		const pC = list.refresh(1)
		expect(global.fetch).toHaveBeenCalledTimes(2)

		other.resolve(badResponse())
		await pB
		shared.resolve(okResponse([{ id: 'a' }]))
		await Promise.all([pA, pC])
		await flush()

		expect(store.errors.t).not.toBeNull()
		expect(list.error.value).toBeNull()
		expect(list.objects.value).toEqual([{ id: 'a' }])
	})
})
