/**
 * `useListView` asks a search interpreter how to search for a typed term.
 *
 * A phone number typed as `06 1234 5678` is stored normalised, so the page
 * filters on the normalised field instead of sending the text as `_search`.
 *
 * @spec openspec/changes/index-search-handler/specs/index-page/spec.md#requirement-a-registered-handler-can-read-the-search-before-it-is-sent
 */

import { mount } from '@vue/test-utils'
import { defineComponent, h, reactive } from 'vue'
import { useListView } from '../../src/composables/useListView.js'

/**
 * A fake object store recording every collection fetch.
 *
 * @return {object} The store
 */
function fakeStore() {
	return reactive({
		collections: {},
		loading: {},
		pagination: {},
		facets: {},
		fetchCollection: jest.fn().mockResolvedValue([]),
		fetchSchema: jest.fn().mockResolvedValue({ title: 'T', properties: {} }),
	})
}

/**
 * Mount a host that exposes the composable as `vm.list`.
 *
 * @param {object} store The fake object store
 * @param {Function} [searchInterpreter] The interpreter
 * @return {object} The wrapper
 */
function mountList(store, searchInterpreter) {
	const Comp = defineComponent({
		setup() {
			return { list: useListView('t', { objectStore: store, searchInterpreter }) }
		},
		render() {
			return h('div')
		},
	})
	return mount(Comp)
}

/**
 * The params of the last collection fetch.
 *
 * @param {object} store The fake object store
 * @return {object} The params
 */
function lastParams(store) {
	const calls = store.fetchCollection.mock.calls
	return calls[calls.length - 1][1]
}

describe('useListView searchInterpreter', () => {
	it('sends the reading as filters, without _search, and exposes its note', async () => {
		const store = fakeStore()
		const interpreter = jest.fn((term) => (term === '06 1234 5678'
			? Promise.resolve({ filters: { phoneE164: '+31612345678' }, note: 'Searching by phone number' })
			: null))
		const w = mountList(store, interpreter)
		w.vm.list.searchTerm.value = '06 1234 5678'

		await w.vm.list.refresh(1)

		expect(lastParams(store).phoneE164).toBe('+31612345678')
		expect(lastParams(store)._search).toBeUndefined()
		expect(w.vm.list.searchNote.value).toBe('Searching by phone number')
		expect(w.vm.list.buildParams(1).phoneE164).toBe('+31612345678')
	})

	it('sends other text as typed with no note', async () => {
		const store = fakeStore()
		const w = mountList(store, () => null)
		w.vm.list.searchTerm.value = 'riolering'

		await w.vm.list.refresh(1)

		expect(lastParams(store)._search).toBe('riolering')
		expect(w.vm.list.searchNote.value).toBe('')
	})

	it('sends a replacement search text when the reading gives one', async () => {
		const store = fakeStore()
		const w = mountList(store, () => ({ search: 'riool' }))
		w.vm.list.searchTerm.value = 'riolering'

		await w.vm.list.refresh(1)

		expect(lastParams(store)._search).toBe('riool')
	})

	it('falls back to the typed term when the interpreter throws', async () => {
		const store = fakeStore()
		const w = mountList(store, () => {
			throw new Error('offline')
		})
		w.vm.list.searchTerm.value = '06 1234 5678'

		await w.vm.list.refresh(1)

		expect(lastParams(store)._search).toBe('06 1234 5678')
		expect(w.vm.list.searchNote.value).toBe('')
	})

	it('asks once per term, and forgets the reading when the search is cleared', async () => {
		const store = fakeStore()
		const interpreter = jest.fn(() => ({ filters: { phoneE164: '+31612345678' }, note: 'Searching by phone number' }))
		const w = mountList(store, interpreter)
		w.vm.list.searchTerm.value = '0612345678'

		await w.vm.list.refresh(1)
		await w.vm.list.refresh(2)
		expect(interpreter).toHaveBeenCalledTimes(1)

		w.vm.list.searchTerm.value = ''
		await w.vm.list.refresh(1)
		expect(lastParams(store).phoneE164).toBeUndefined()
		expect(w.vm.list.searchNote.value).toBe('')
	})
})
