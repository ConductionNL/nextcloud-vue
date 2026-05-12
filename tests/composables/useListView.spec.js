/**
 * Tests for `useListView`'s `opts.fixedFilters` (REQ-MISF-5 of the
 * `manifest-index-self-fetch` change): an always-merged filter map (plain
 * object OR a getter returning one) spread into every fetch AFTER the user's
 * `activeFilters`, so the fixed entries always win. Omitting it must be
 * behaviourally identical to before.
 */

import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { useListView } from '../../src/composables/useListView.js'

/**
 * Build a minimal fake objectStore exposing only what the new-API
 * `useListView` touches.
 *
 * @return {object} Fake store with a `fetchCollection` jest mock.
 */
function makeStore() {
	return {
		collections: {},
		loading: {},
		pagination: {},
		facets: {},
		fetchCollection: jest.fn().mockResolvedValue([]),
		fetchSchema: jest.fn().mockResolvedValue({ title: 'T', properties: {} }),
	}
}

/**
 * Mount a host component that calls `useListView('t', opts)` and exposes the
 * returned API on `vm.list`.
 *
 * @param {object} store The fake object store.
 * @param {object} opts Extra options merged into the `useListView` call.
 * @return {object} The Vue Test Utils wrapper.
 */
function mountList(store, opts) {
	const Comp = defineComponent({
		setup() {
			const list = useListView('t', { objectStore: store, ...opts })
			return { list }
		},
		render() { return h('div') },
	})
	return mount(Comp)
}

describe('useListView — fixedFilters', () => {
	it('a plain-object fixedFilters is present in every fetch', async () => {
		const store = makeStore()
		const w = mountList(store, { fixedFilters: { a: 1 } })
		await new Promise((resolve) => setTimeout(resolve))
		expect(store.fetchCollection).toHaveBeenCalled()
		expect(store.fetchCollection.mock.calls[0][1].a).toBe(1)

		await w.vm.list.onSearch('hello')
		await new Promise((resolve) => setTimeout(resolve, 350))
		const last = store.fetchCollection.mock.calls[store.fetchCollection.mock.calls.length - 1][1]
		expect(last.a).toBe(1)
		expect(last._search).toBe('hello')
	})

	it('a getter fixedFilters is re-read on each fetch', async () => {
		const store = makeStore()
		const scope = ref('alpha')
		const w = mountList(store, { fixedFilters: () => ({ scope: scope.value }) })
		await new Promise((resolve) => setTimeout(resolve))
		expect(store.fetchCollection.mock.calls[0][1].scope).toBe('alpha')

		scope.value = 'beta'
		await w.vm.list.refresh(1)
		const last = store.fetchCollection.mock.calls[store.fetchCollection.mock.calls.length - 1][1]
		expect(last.scope).toBe('beta')
	})

	it('fixedFilters wins over a colliding activeFilter', async () => {
		const store = makeStore()
		const w = mountList(store, { fixedFilters: { status: 'open' } })
		await new Promise((resolve) => setTimeout(resolve))

		w.vm.list.onFilterChange('status', ['closed'])
		await new Promise((resolve) => setTimeout(resolve))
		const last = store.fetchCollection.mock.calls[store.fetchCollection.mock.calls.length - 1][1]
		expect(last.status).toBe('open')
	})

	it('no fixedFilters → params are the pre-change shape', async () => {
		const store = makeStore()
		mountList(store, {})
		await new Promise((resolve) => setTimeout(resolve))
		expect(store.fetchCollection).toHaveBeenCalled()
		const params = store.fetchCollection.mock.calls[0][1]
		expect(params).toEqual({ _limit: 20, _page: 1 })
	})
})
