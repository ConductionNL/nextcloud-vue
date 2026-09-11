/**
 * `useListView` exposes the store's facets.
 *
 * A folder pane grouping by a field needs the distinct values across the whole
 * query, not across the loaded page. The platform computes exactly that, and
 * the store holds it, but until now the only way out of the composable was the
 * metadata sidebar's state. That made the folder pane's correctness depend on
 * a different feature being switched on.
 */

import { mount } from '@vue/test-utils'
import { defineComponent, h, reactive } from 'vue'
import { useListView } from '../../src/composables/useListView.js'

/**
 * Mount a host that exposes the composable as `vm.list`.
 *
 * @param {object} store The fake object store
 * @return {object} The wrapper
 */
function mountList(store) {
	const Comp = defineComponent({
		setup() {
			return { list: useListView('t', { objectStore: store }) }
		},
		render() {
			return h('div')
		},
	})
	return mount(Comp)
}

describe('useListView facets', () => {
	it('exposes the store facets for the object type', () => {
		const store = reactive({
			collections: {},
			loading: {},
			pagination: {},
			facets: { t: { category: { values: [{ value: 'Bezwaar', count: 12 }] } } },
			fetchCollection: jest.fn().mockResolvedValue([]),
			fetchSchema: jest.fn().mockResolvedValue({ title: 'T', properties: {} }),
		})

		const w = mountList(store)

		expect(w.vm.list.facets.value.category.values).toEqual([{ value: 'Bezwaar', count: 12 }])
	})

	it('is an empty object when the type has no facets yet', () => {
		const store = reactive({
			collections: {},
			loading: {},
			pagination: {},
			facets: {},
			fetchCollection: jest.fn().mockResolvedValue([]),
			fetchSchema: jest.fn().mockResolvedValue({ title: 'T', properties: {} }),
		})

		expect(mountList(store).vm.list.facets.value).toEqual({})
	})
})
