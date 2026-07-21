/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 */

import { createObjectSearchSource, resolveManifestDetailRoute } from '@/utils/commandPaletteObjectSource.js'

/**
 * Build a minimal fake `useObjectStore()`-shaped store whose
 * `fetchCollection` resolves per-type from a fixture map, optionally after
 * a delay — lets tests exercise the staleness/cancellation guard.
 *
 * @param {Record<string, object[]>} fixtures type → objects.
 * @param {Record<string, number>} [delays] type → resolve delay (ms).
 * @return {{fetchCollection: jest.Mock}} The fake store.
 */
function createFakeStore(fixtures, delays = {}) {
	return {
		fetchCollection: jest.fn((type, params) => {
			const delay = delays[type] || 0
			const results = (fixtures[type] || []).filter((o) => {
				const q = (params._search || '').toLowerCase()
				return !q || JSON.stringify(o).toLowerCase().includes(q)
			})
			return new Promise((resolve) => setTimeout(() => resolve(results), delay))
		}),
	}
}

describe('createObjectSearchSource', () => {
	it('throws without a store exposing fetchCollection', () => {
		expect(() => createObjectSearchSource({ types: ['x'] })).toThrow()
		expect(() => createObjectSearchSource({ store: {}, types: ['x'] })).toThrow()
	})

	it('resolves an empty array below minQueryLength without calling the store', async () => {
		const store = createFakeStore({ articles: [{ id: 1, title: 'Hello' }] })
		const source = createObjectSearchSource({ store, types: ['articles'], minQueryLength: 2 })
		const results = await source.search('h')
		expect(results).toEqual([])
		expect(store.fetchCollection).not.toHaveBeenCalled()
	})

	it('aggregates results across multiple types', async () => {
		const store = createFakeStore({
			articles: [{ id: 1, title: 'Hello world' }],
			pages: [{ id: 2, title: 'Hello page' }],
		})
		const source = createObjectSearchSource({ store, types: ['articles', 'pages'] })
		const results = await source.search('hello')
		expect(results.map((r) => r.title).sort()).toEqual(['Hello page', 'Hello world'])
		expect(store.fetchCollection).toHaveBeenCalledWith('articles', { _search: 'hello', _limit: 6 })
		expect(store.fetchCollection).toHaveBeenCalledWith('pages', { _search: 'hello', _limit: 6 })
	})

	it('applies the default resolveResult (title-ish field sniffing)', async () => {
		const store = createFakeStore({ articles: [{ id: 1, name: 'Named thing' }] })
		const source = createObjectSearchSource({ store, types: ['articles'] })
		const results = await source.search('named')
		expect(results[0]).toMatchObject({ title: 'Named thing', subtitle: 'articles' })
	})

	it('uses a custom resolveResult and wires `run` from `route` via the router', async () => {
		const store = createFakeStore({ articles: [{ id: 42, title: 'Invoice #42' }] })
		const push = jest.fn()
		const source = createObjectSearchSource({
			store,
			types: ['articles'],
			router: { push },
			resolveResult: (obj) => ({ title: obj.title, route: { path: `/detail/${obj.id}` } }),
		})
		const results = await source.search('invoice')
		expect(results).toHaveLength(1)
		results[0].run()
		expect(push).toHaveBeenCalledWith({ path: '/detail/42' })
	})

	it('prefers an explicit `run` over `route`', async () => {
		const store = createFakeStore({ articles: [{ id: 1, title: 'Xx' }] })
		const push = jest.fn()
		const customRun = jest.fn()
		const source = createObjectSearchSource({
			store,
			types: ['articles'],
			router: { push },
			resolveResult: () => ({ title: 'Xx', route: { path: '/x' }, run: customRun }),
		})
		const results = await source.search('xx')
		results[0].run()
		expect(customRun).toHaveBeenCalled()
		expect(push).not.toHaveBeenCalled()
	})

	it('discards a stale (superseded) response instead of returning it', async () => {
		const store = createFakeStore(
			{ articles: [{ id: 1, title: 'Slow result' }] },
			{ articles: 50 },
		)
		const source = createObjectSearchSource({ store, types: ['articles'] })
		const stalePromise = source.search('slow')
		// A newer call supersedes the first before it resolves.
		const freshResults = await source.search('slow')
		const staleResults = await stalePromise
		expect(staleResults).toEqual([])
		expect(freshResults).toHaveLength(1)
	})

	it('tolerates a rejected fetchCollection for one type without failing the others', async () => {
		const store = {
			fetchCollection: jest.fn((type) => (type === 'broken'
				? Promise.reject(new Error('boom'))
				: Promise.resolve([{ id: 1, title: 'OK result' }]))),
		}
		const source = createObjectSearchSource({ store, types: ['broken', 'fine'] })
		const results = await source.search('ok')
		expect(results).toHaveLength(1)
		expect(results[0].title).toBe('OK result')
	})

	it('skips a result with no resolvable title', async () => {
		const store = createFakeStore({ articles: [{ id: 1 }] })
		const source = createObjectSearchSource({
			store,
			types: ['articles'],
			resolveResult: () => ({ title: '' }),
		})
		const results = await source.search('anything-long-enough')
		expect(results).toEqual([])
	})
})

describe('resolveManifestDetailRoute', () => {
	const pages = [
		{ id: 'p1', type: 'index', route: '/list', config: {} },
		{ id: 'p2', type: 'detail', route: '/invoices/:id', config: { register: 'billing', schema: 'invoice' } },
	]

	it('resolves the matching detail page route, substituting the :param segment', () => {
		const route = resolveManifestDetailRoute(pages, { register: 'billing', schema: 'invoice', id: '42' })
		expect(route).toEqual({ path: '/invoices/42' })
	})

	it('returns null when no detail page matches the register/schema', () => {
		expect(resolveManifestDetailRoute(pages, { register: 'other', schema: 'invoice', id: '1' })).toBeNull()
	})

	it('returns null without an id', () => {
		expect(resolveManifestDetailRoute(pages, { register: 'billing', schema: 'invoice' })).toBeNull()
	})

	it('returns null for a non-array pages input', () => {
		expect(resolveManifestDetailRoute(null, { register: 'billing', schema: 'invoice', id: '1' })).toBeNull()
	})
})
