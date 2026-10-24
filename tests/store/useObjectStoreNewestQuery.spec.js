/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * An index list shows the newest query it asked for, whatever order the
 * responses arrive in, and a live refetch repeats that query.
 *
 * @spec openspec/changes/list-keeps-its-newest-query/specs/list-keeps-its-newest-query/spec.md#requirement-the-newest-list-query-decides-what-the-list-shows
 * @spec openspec/changes/list-keeps-its-newest-query/specs/list-keeps-its-newest-query/spec.md#requirement-a-live-refetch-repeats-the-newest-query
 */

import { createPinia, setActivePinia } from 'pinia'
import { liveUpdatesPlugin } from '../../src/store/plugins/liveUpdates.js'
import { createObjectStore } from '../../src/store/useObjectStore.js'

jest.mock('@nextcloud/notify_push', () => ({
	__esModule: true,
	listen: jest.fn(() => true),
}))

function rows(n) {
	return Array.from({ length: n }, (_, i) => ({ id: `case-${i}` }))
}

/**
 * Answer each fetch only when the test resolves it, keyed by its `_limit`.
 *
 * @return {{ resolve: (limit: number, page?: number) => void }} The release handle.
 */
function deferredFetch() {
	const pending = []
	global.fetch = jest.fn((url) => new Promise((resolve) => {
		const query = new URL(String(url), 'http://localhost').searchParams
		pending.push({ limit: Number(query.get('_limit')), page: Number(query.get('_page') || 1), resolve })
	}))
	return {
		resolve(limit, page = 1) {
			const at = pending.findIndex((p) => p.limit === limit && p.page === page)
			const [entry] = pending.splice(at, 1)
			const count = limit === 500 ? 310 : 20
			entry.resolve({ ok: true, json: () => Promise.resolve({ results: rows(count), total: 310, page, pages: Math.ceil(310 / limit) }) })
		},
	}
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('the newest list query decides what the list shows', () => {
	let store

	beforeEach(() => {
		setActivePinia(createPinia())
		store = createObjectStore('newest-query', { plugins: [liveUpdatesPlugin()] })()
		store.registerObjectType('case', 'schema-uuid', 'register-uuid')
	})

	it('keeps the table page when the board fetch lands after it', async () => {
		const net = deferredFetch()
		const board = store.fetchCollection('case', { _limit: 500, _page: 1 })
		await flush()
		const table = store.fetchCollection('case', { _limit: 20, _page: 1 })
		await flush()

		net.resolve(20)
		await table
		net.resolve(500)
		await board

		expect(store.collections.case).toHaveLength(20)
		expect(store.pagination.case).toMatchObject({ total: 310, limit: 20, pages: 16 })
		expect(store.loading.case).toBe(false)
	})

	it('keeps loading until the newest fetch is in', async () => {
		const net = deferredFetch()
		const board = store.fetchCollection('case', { _limit: 500, _page: 1 })
		await flush()
		const table = store.fetchCollection('case', { _limit: 20, _page: 1 })
		await flush()

		net.resolve(500)
		await board
		expect(store.loading.case).toBe(true)
		expect(store.collections.case || []).toHaveLength(0)

		net.resolve(20)
		await table
		expect(store.loading.case).toBe(false)
		expect(store.collections.case).toHaveLength(20)
	})

	it('drops a board page appended after the list was fetched again', async () => {
		const net = deferredFetch()
		const first = store.fetchCollection('case', { _limit: 500, _page: 1 })
		await flush()
		net.resolve(500)
		await first

		const more = store.fetchCollection('case', { _limit: 500, _page: 2 }, { append: true })
		await flush()
		const table = store.fetchCollection('case', { _limit: 20, _page: 1 })
		await flush()
		net.resolve(20)
		await table
		net.resolve(500, 2)
		await more

		expect(store.collections.case).toHaveLength(20)
	})
})

describe('a live refetch repeats the newest query', () => {
	let store

	beforeEach(() => {
		setActivePinia(createPinia())
		store = createObjectStore('newest-query-live', { plugins: [liveUpdatesPlugin()] })()
		store.registerObjectType('case', 'schema-uuid', 'register-uuid')
	})

	it('records the table query while its fetch is still in flight', async () => {
		const net = deferredFetch()
		const board = store.fetchCollection('case', { _limit: 500, _page: 1 })
		await flush()
		net.resolve(500)
		await board

		const table = store.fetchCollection('case', { _limit: 20, _page: 1 })
		await flush()

		expect(store.__lastCollectionParams.get('case')).toEqual({ _limit: 20, _page: 1 })
		net.resolve(20)
		await table
	})

	it('does not record a board page added with load more', async () => {
		const net = deferredFetch()
		const first = store.fetchCollection('case', { _limit: 500, _page: 1 })
		await flush()
		net.resolve(500)
		await first

		const more = store.fetchCollection('case', { _limit: 500, _page: 2 }, { append: true })
		await flush()
		net.resolve(500, 2)
		await more

		expect(store.__lastCollectionParams.get('case')).toEqual({ _limit: 500, _page: 1 })
	})
})
