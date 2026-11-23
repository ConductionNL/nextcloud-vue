// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * `useListView().loadMore()` against the REAL object store: the next page is
 * added after the rows already loaded (a board shows every row), the last
 * page asks for nothing, and a refresh started meanwhile drops the page.
 *
 * @spec openspec/changes/board-loads-every-row/specs/board-view/spec.md#requirement-the-index-board-shows-every-matching-row
 */

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { useListView } from '../../src/composables/useListView.js'
import { createObjectStore } from '../../src/store/useObjectStore.js'

const flush = () => new Promise((resolve) => setTimeout(resolve))

/**
 * @param {Array<object>} rows The rows returned.
 * @param {number} page The page answered.
 * @param {number} pages The page count.
 * @param {number} total The matching total.
 * @return {object} A 200 response.
 */
function okResponse(rows, page, pages, total) {
	return {
		ok: true,
		status: 200,
		headers: { get: () => 'application/json' },
		json: () => Promise.resolve({ results: rows, total, page, pages }),
		text: () => Promise.resolve(''),
	}
}

/**
 * @return {{promise: Promise, resolve: (value: object) => void}} A response the test settles by hand.
 */
function deferred() {
	let resolve
	const promise = new Promise((r) => {
		resolve = r
	})
	return { promise, resolve }
}

/**
 * @param {object} first The first response.
 * @return {Promise<{store: object, list: object}>} The store and the composable.
 */
async function setup(first) {
	setActivePinia(createPinia())
	const store = createObjectStore('load-more-store')()
	store.registerObjectType('t', 'schema-id', 'register-id')
	global.fetch = jest.fn().mockResolvedValue(first)
	const Comp = defineComponent({
		setup() {
			return { list: useListView('t', { objectStore: store, defaultPageSize: 2 }) }
		},
		render() {
			return h('div')
		},
	})
	const w = mount(Comp)
	await flush()
	return { store, list: w.vm.list }
}

describe('useListView loadMore', () => {
	it('adds the next page after the loaded rows', async () => {
		const { list } = await setup(okResponse([{ id: 'a' }, { id: 'b' }], 1, 2, 3))
		global.fetch = jest.fn().mockResolvedValue(okResponse([{ id: 'c' }], 2, 2, 3))

		await list.loadMore()

		expect(String(global.fetch.mock.calls[0][0])).toContain('_page=2')
		expect(list.objects.value.map((r) => r.id)).toEqual(['a', 'b', 'c'])
		expect(list.pagination.value).toMatchObject({ page: 2, pages: 2, total: 3 })
	})

	it('asks for nothing on the last page', async () => {
		const { list } = await setup(okResponse([{ id: 'a' }], 1, 1, 1))
		global.fetch = jest.fn()

		await list.loadMore()

		expect(global.fetch).not.toHaveBeenCalled()
		expect(list.objects.value.map((r) => r.id)).toEqual(['a'])
	})

	it('drops the page when a refresh started while it was in flight', async () => {
		const { list } = await setup(okResponse([{ id: 'a' }, { id: 'b' }], 1, 2, 3))
		const more = deferred()
		global.fetch = jest.fn()
			.mockImplementationOnce(() => more.promise)
			.mockResolvedValueOnce(okResponse([{ id: 'x' }], 1, 1, 1))

		const pMore = list.loadMore()
		list.searchTerm.value = 'x'
		await list.refresh(1)
		more.resolve(okResponse([{ id: 'c' }], 2, 2, 3))
		await pMore

		expect(list.objects.value.map((r) => r.id)).toEqual(['x'])
	})

	it('adds a page once when it is asked for twice', async () => {
		const { list } = await setup(okResponse([{ id: 'a' }, { id: 'b' }], 1, 2, 3))
		global.fetch = jest.fn().mockResolvedValue(okResponse([{ id: 'c' }], 2, 2, 3))

		await Promise.all([list.loadMore(), list.loadMore()])

		expect(list.objects.value.map((r) => r.id)).toEqual(['a', 'b', 'c'])
	})
})
