// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * `useListView` exposes the outcome of its latest refresh as `error`.
 *
 * The store records a failed fetch on `errors[type]` and keeps the previous
 * rows, so `objects` alone cannot tell a consumer whether what it shows is
 * current. `objects` and `pagination` are left exactly as the store has them.
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

/**
 * @param {object} [overrides] Store fields to override.
 * @return {object} A reactive fake store holding one earlier row.
 */
function makeStore(overrides = {}) {
	return reactive({
		collections: { t: [{ id: 'old' }] },
		loading: {},
		pagination: { t: { total: 1, page: 1, pages: 1, limit: 20 } },
		facets: {},
		errors: {},
		fetchCollection: jest.fn().mockResolvedValue([]),
		fetchSchema: jest.fn().mockResolvedValue({ title: 'T', properties: {} }),
		...overrides,
	})
}

const flush = () => new Promise((resolve) => setTimeout(resolve))

describe('useListView error', () => {
	it('is null until a refresh fails, and holds the store error after it', async () => {
		const store = makeStore()
		const w = mountList(store)
		await flush()
		expect(w.vm.list.error.value).toBeNull()

		const failure = { status: 400, message: 'Bad search' }
		store.fetchCollection.mockImplementationOnce(async () => {
			store.errors = { t: failure }
			return []
		})
		await w.vm.list.refresh(1)

		expect(w.vm.list.error.value).toEqual(failure)
		// The composable does not blank the store's rows itself.
		expect(w.vm.list.objects.value).toEqual([{ id: 'old' }])
	})

	it('is cleared by the next successful refresh', async () => {
		const store = makeStore()
		store.fetchCollection.mockImplementationOnce(async () => {
			store.errors = { t: { status: 400 } }
			return []
		})
		const w = mountList(store)
		await flush()
		expect(w.vm.list.error.value).not.toBeNull()

		store.fetchCollection.mockImplementationOnce(async () => {
			store.errors = { t: null }
			return []
		})
		await w.vm.list.refresh(1)
		expect(w.vm.list.error.value).toBeNull()
	})

	it('holds a thrown error and rethrows it', async () => {
		const store = makeStore()
		const w = mountList(store)
		await flush()

		const thrown = new Error('store blew up')
		store.fetchCollection.mockRejectedValueOnce(thrown)
		await expect(w.vm.list.refresh(1)).rejects.toBe(thrown)
		expect(w.vm.list.error.value).toBe(thrown)

		await w.vm.list.refresh(1)
		expect(w.vm.list.error.value).toBeNull()
	})

	it('stays null for a store without an errors map', async () => {
		const store = makeStore()
		delete store.errors
		const w = mountList(store)
		await flush()
		await w.vm.list.refresh(1)
		expect(w.vm.list.error.value).toBeNull()
	})
})
