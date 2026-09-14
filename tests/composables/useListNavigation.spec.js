/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * useListNavigation: a handler works a queue without going back to it.
 *
 * The interesting cases are the refusals. A next button that steps somewhere
 * the handler never chose is worse than no next button, so most of what is
 * asserted here is that nothing is offered: on a bare link, on a record the
 * list does not hold, on a list that failed to load, and at either end.
 *
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 */

import { nextTick, ref } from 'vue'
import { useListNavigation } from '../../src/composables/useListNavigation.js'

const QUEUE = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]

/**
 * A route carrying the list a record was opened from.
 *
 * @param {object} [query] Extra query keys.
 * @return {object} The route.
 */
function routeWithContext(query = {}) {
	return { name: 'case-detail', params: { id: 'b' }, query: { _from: 'cases', status: 'open', ...query } }
}

describe('useListNavigation — the list is in the address', () => {
	it('steps to the next case of that same filtered list', async () => {
		const fetchList = jest.fn().mockResolvedValue(QUEUE)
		const router = { push: jest.fn().mockResolvedValue(undefined) }
		const nav = useListNavigation({ route: routeWithContext(), router, currentId: 'b', fetchList })
		await nextTick()
		await nextTick()

		expect(nav.available.value).toBe(true)
		expect(nav.goNext()).toBe('c')
		expect(router.push).toHaveBeenCalledWith(expect.objectContaining({ params: expect.objectContaining({ id: 'c' }) }))
	})

	it('asks the API for the list the handler was actually looking at', async () => {
		const fetchList = jest.fn().mockResolvedValue(QUEUE)
		useListNavigation({
			route: routeWithContext({ _search: 'vergunning', _order: '[{"key":"createdAt","order":"desc"}]' }),
			currentId: 'b',
			fetchList,
		})
		await nextTick()
		await nextTick()

		expect(fetchList).toHaveBeenCalledWith(expect.objectContaining({
			_search: 'vergunning',
			_order: { createdAt: 'desc' },
			status: 'open',
		}))
	})

	it('keeps the list context on the record it opens, so the next step still works', async () => {
		const router = { push: jest.fn().mockResolvedValue(undefined) }
		const nav = useListNavigation({ route: routeWithContext(), router, currentId: 'b', fetchList: async () => QUEUE })
		await nextTick()
		await nextTick()

		nav.goNext()

		expect(router.push.mock.calls[0][0].query).toEqual({ _from: 'cases', status: 'open' })
	})

	it('reports the position in the queue', async () => {
		const nav = useListNavigation({ route: routeWithContext(), currentId: 'b', fetchList: async () => QUEUE })
		await nextTick()
		await nextTick()

		expect([nav.position.value, nav.total.value]).toEqual([2, 4])
	})
})

describe('useListNavigation — the refusals', () => {
	it('offers nothing on a link carrying no list context, and asks for nothing', async () => {
		const fetchList = jest.fn()
		const nav = useListNavigation({ route: { name: 'case-detail', query: {} }, currentId: 'b', fetchList })
		await nextTick()
		await nextTick()

		expect(nav.available.value).toBe(false)
		expect(nav.hasNext.value).toBe(false)
		expect(fetchList).not.toHaveBeenCalled()
	})

	it('offers nothing when the record is not in the list it names', async () => {
		const nav = useListNavigation({ route: routeWithContext(), currentId: 'zz', fetchList: async () => QUEUE })
		await nextTick()
		await nextTick()

		expect(nav.available.value).toBe(false)
	})

	it('offers nothing when the list could not be read, rather than "1 of 0"', async () => {
		const nav = useListNavigation({
			route: routeWithContext(),
			currentId: 'b',
			fetchList: async () => { throw new Error('502') },
		})
		await nextTick()
		await nextTick()

		expect(nav.failed.value).toBe(true)
		expect(nav.available.value).toBe(false)
	})

	it('offers nothing when there is no way to load the list at all', async () => {
		const nav = useListNavigation({ route: routeWithContext(), currentId: 'b' })
		await nextTick()
		await nextTick()

		expect(nav.available.value).toBe(false)
	})

	it('says the last case is the last and goes nowhere', async () => {
		const router = { push: jest.fn() }
		const nav = useListNavigation({ route: routeWithContext(), router, currentId: 'd', fetchList: async () => QUEUE })
		await nextTick()
		await nextTick()

		expect(nav.isLast.value).toBe(true)
		expect(nav.goNext()).toBeNull()
		expect(router.push).not.toHaveBeenCalled()
	})

	it('says the first case is the first and goes nowhere', async () => {
		const router = { push: jest.fn() }
		const nav = useListNavigation({ route: routeWithContext(), router, currentId: 'a', fetchList: async () => QUEUE })
		await nextTick()
		await nextTick()

		expect(nav.isFirst.value).toBe(true)
		expect(nav.goPrevious()).toBeNull()
		expect(router.push).not.toHaveBeenCalled()
	})
})

describe('useListNavigation — a reload keeps the queue', () => {
	it('rebuilds the navigation from the address alone, with no prior state', async () => {
		// This is the reload: a fresh composable, nothing but the route.
		const nav = useListNavigation({ route: routeWithContext(), currentId: 'c', fetchList: async () => QUEUE })
		await nextTick()
		await nextTick()

		expect(nav.available.value).toBe(true)
		expect(nav.neighbours.value.previousId).toBe('b')
		expect(nav.neighbours.value.nextId).toBe('d')
	})

	it('does not refetch the list at every step through it', async () => {
		const fetchList = jest.fn().mockResolvedValue(QUEUE)
		const currentId = ref('b')
		useListNavigation({ route: routeWithContext(), currentId, fetchList })
		await nextTick()
		await nextTick()

		currentId.value = 'c'
		await nextTick()
		await nextTick()

		expect(fetchList).toHaveBeenCalledTimes(1)
	})

	it('refetches when the filter in the address changes, because that is a different list', async () => {
		const fetchList = jest.fn().mockResolvedValue(QUEUE)
		const route = ref(routeWithContext())
		useListNavigation({ route, currentId: 'b', fetchList })
		await nextTick()
		await nextTick()

		route.value = routeWithContext({ status: 'closed' })
		await nextTick()
		await nextTick()

		expect(fetchList).toHaveBeenCalledTimes(2)
	})

	it('reads ids straight off a list that returns them, not only off records', async () => {
		const nav = useListNavigation({ route: routeWithContext(), currentId: 'b', fetchList: async () => ['a', 'b', 'c'] })
		await nextTick()
		await nextTick()

		expect(nav.neighbours.value.nextId).toBe('c')
	})
})

describe('useListNavigation — the store fetcher', () => {
	it('goes through the object store when no fetcher was injected', async () => {
		const objectStore = {
			fetchCollection: jest.fn().mockResolvedValue(undefined),
			collections: { case: QUEUE },
		}
		const nav = useListNavigation({ route: routeWithContext(), currentId: 'b', objectType: 'case', objectStore })
		await nextTick()
		await nextTick()

		expect(objectStore.fetchCollection).toHaveBeenCalledWith('case', expect.objectContaining({ status: 'open' }))
		expect(nav.available.value).toBe(true)
	})
})
