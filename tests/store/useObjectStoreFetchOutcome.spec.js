// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * `fetchCollection(type, params, { outcome })` reports THIS call's own result
 * into the caller's sink. `errors[type]` is shared by every call for the type
 * (cleared when a call starts, never on success), so it cannot say which
 * request failed. The option is opt-in: without it the call, its return value
 * and `errors[type]` behave exactly as before.
 */

import { createPinia, setActivePinia } from 'pinia'
import { createObjectStore } from '../../src/store/useObjectStore.js'

/**
 * @param {Array<object>} rows The rows returned.
 * @return {object} A 200 response.
 */
function okResponse(rows) {
	return { ok: true, json: () => Promise.resolve({ results: rows, total: rows.length, page: 1, pages: 1 }) }
}

/**
 * @return {object} A 400 response.
 */
function badResponse() {
	return { ok: false, status: 400, statusText: 'Bad Request', json: () => Promise.resolve({ message: 'Invalid search query' }) }
}

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

describe('useObjectStore fetchCollection outcome option', () => {
	let store

	beforeEach(() => {
		setActivePinia(createPinia())
		store = createObjectStore('outcome-store')()
		store.registerObjectType('client', '28', '5')
		jest.spyOn(console, 'error').mockImplementation(() => {})
	})

	afterEach(() => {
		console.error.mockRestore()
	})

	it('sets outcome.error to null on success and returns the rows as before', async () => {
		global.fetch = jest.fn().mockResolvedValue(okResponse([{ id: '1' }]))
		const outcome = {}

		const result = await store.fetchCollection('client', {}, { outcome })

		expect(result).toEqual([{ id: '1' }])
		expect(outcome).toEqual({ error: null })
		expect(store.collections.client).toEqual([{ id: '1' }])
	})

	it('sets outcome.error to the same error it records on errors[type] for an HTTP failure', async () => {
		global.fetch = jest.fn().mockResolvedValue(badResponse())
		const outcome = {}

		const result = await store.fetchCollection('client', {}, { outcome })

		expect(result).toEqual([])
		// Equal, not identical: the store's copy is wrapped in Pinia's reactive proxy.
		expect(outcome.error).toEqual(store.errors.client)
		expect(outcome.error.status).toBe(400)
	})

	it('sets outcome.error for a network failure', async () => {
		global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'))
		const outcome = {}

		await store.fetchCollection('client', {}, { outcome })

		expect(outcome.error).toEqual(store.errors.client)
		expect(outcome.error.status).toBe(0)
	})

	it('keeps each call\'s own result while errors[type] holds whichever failure landed last', async () => {
		const older = deferred()
		const newer = deferred()
		global.fetch = jest.fn()
			.mockImplementationOnce(() => older.promise)
			.mockImplementationOnce(() => newer.promise)
		const olderOutcome = {}
		const newerOutcome = {}

		const pOlder = store.fetchCollection('client', { _search: 'a (' }, { outcome: olderOutcome })
		const pNewer = store.fetchCollection('client', { _search: 'a' }, { outcome: newerOutcome })
		older.resolve(badResponse())
		await pOlder
		newer.resolve(okResponse([{ id: 'b' }]))
		await pNewer

		// The shared map is unchanged in meaning: the older failure stays on it.
		expect(store.errors.client.status).toBe(400)
		expect(olderOutcome.error.status).toBe(400)
		expect(newerOutcome.error).toBeNull()
	})

	it('behaves as before without the option', async () => {
		global.fetch = jest.fn().mockResolvedValue(badResponse())

		await expect(store.fetchCollection('client')).resolves.toEqual([])
		await expect(store.fetchCollection('client', {}, null)).resolves.toEqual([])
		expect(store.errors.client.status).toBe(400)
	})

	it('reports a deduplicated request\'s result to every caller that joined it', async () => {
		store.__liveDedupActive = true
		const shared = deferred()
		global.fetch = jest.fn().mockImplementationOnce(() => shared.promise)
		const first = {}
		const joined = {}

		const p1 = store.fetchCollection('client', { _search: 'x' }, { outcome: first })
		const p2 = store.fetchCollection('client', { _search: 'x' }, { outcome: joined })
		const p3 = store.fetchCollection('client', { _search: 'x' })
		expect(global.fetch).toHaveBeenCalledTimes(1)
		shared.resolve(badResponse())
		const results = await Promise.all([p1, p2, p3])

		expect(results).toEqual([[], [], []])
		expect(first.error.status).toBe(400)
		expect(joined.error).toBe(first.error)
	})
})
