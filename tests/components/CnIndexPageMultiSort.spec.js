/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnIndexPage's multi-column sort wiring (self-fetch mode):
 * translating the active sort-key list into OpenRegister's `_order`
 * format, persisting it in `$route.query._order`, and restoring it on
 * mount from a deep-linked/bookmarked URL.
 */

// `mock`-prefixed so jest.mock()'s hoisted factory may reference it.
const mockStore = {
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Decision', properties: {} }),
	getSchema: jest.fn(() => ({ title: 'Decision', properties: {} })),
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const { mount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const stubs = {
	CnDataTable: true,
	CnCardGrid: true,
	CnPagination: true,
	CnActionsBar: true,
	CnContextMenu: true,
	CnRowActions: true,
	CnIndexSidebar: true,
	CnPageHeader: true,
	CnMassDeleteDialog: true,
	CnMassCopyDialog: true,
	CnMassExportDialog: true,
	CnMassImportDialog: true,
	CnDeleteDialog: true,
	CnCopyDialog: true,
	CnFormDialog: true,
	CnAdvancedFormDialog: true,
	NcLoadingIcon: true,
	NcEmptyContent: true,
	CnIcon: true,
}

/**
 * Mount helper mirroring CnIndexPageSelfFetch.spec.js's convention.
 *
 * @param {object} propsData Component props.
 * @param {object} [route] Mocked `$route` (defaults to `{ params: {}, query: {} }`).
 * @return {{wrapper: object, replace: jest.Mock}} The wrapper and the `$router.replace` mock.
 */
function mountPage(propsData, route) {
	const replace = jest.fn(() => Promise.resolve())
	const wrapper = mount(CnIndexPage, {
		propsData,
		stubs,
		mocks: {
			$route: route || { params: {}, query: {} },
			$router: { push: jest.fn(), replace },
		},
	})
	return { wrapper, replace }
}

beforeEach(() => {
	mockStore.registerObjectType.mockClear()
	mockStore.fetchCollection.mockClear()
	mockStore.fetchSchema.mockClear()
	mockStore.collections = {}
	mockStore.loading = {}
	mockStore.pagination = {}
})

describe('CnIndexPage — multi-sort -> _order translation (self-fetch)', () => {
	it('a single-key sort event builds _order identical to pre-multi-sort output', async () => {
		const { wrapper } = mountPage({ title: 'Decisions', register: 'decidesk', schema: 'decision' })
		await new Promise((resolve) => setTimeout(resolve))

		wrapper.vm.onSortEvent({ key: 'title', order: 'asc', keys: [{ key: 'title', order: 'asc' }] })
		await new Promise((resolve) => setTimeout(resolve))

		const last = mockStore.fetchCollection.mock.calls[mockStore.fetchCollection.mock.calls.length - 1][1]
		expect(last._order).toEqual({ title: 'asc' })
	})

	it('a multi-key sort event builds a priority-ordered _order object', async () => {
		const { wrapper } = mountPage({ title: 'Decisions', register: 'decidesk', schema: 'decision' })
		await new Promise((resolve) => setTimeout(resolve))

		wrapper.vm.onSortEvent({
			key: 'status',
			order: 'asc',
			keys: [{ key: 'status', order: 'asc' }, { key: 'createdAt', order: 'desc' }],
		})
		await new Promise((resolve) => setTimeout(resolve))

		const last = mockStore.fetchCollection.mock.calls[mockStore.fetchCollection.mock.calls.length - 1][1]
		expect(last._order).toEqual({ status: 'asc', createdAt: 'desc' })
		expect(Object.keys(last._order)).toEqual(['status', 'createdAt'])
	})
})

describe('CnIndexPage — multi-sort route-query persistence (self-fetch)', () => {
	it('writes $route.query._order (JSON array) when a sort is applied', async () => {
		const { wrapper, replace } = mountPage({ title: 'Decisions', register: 'decidesk', schema: 'decision' })
		await new Promise((resolve) => setTimeout(resolve))

		wrapper.vm.onSortEvent({
			key: 'status',
			order: 'asc',
			keys: [{ key: 'status', order: 'asc' }, { key: 'createdAt', order: 'desc' }],
		})

		expect(replace).toHaveBeenCalled()
		const nav = replace.mock.calls[replace.mock.calls.length - 1][0]
		expect(JSON.parse(nav.query._order)).toEqual([
			{ key: 'status', order: 'asc' },
			{ key: 'createdAt', order: 'desc' },
		])
	})

	it('clearing the sort removes _order from the route query', async () => {
		const { wrapper, replace } = mountPage(
			{ title: 'Decisions', register: 'decidesk', schema: 'decision' },
			{ params: {}, query: { _order: JSON.stringify([{ key: 'title', order: 'asc' }]) } },
		)
		await new Promise((resolve) => setTimeout(resolve))

		wrapper.vm.onSortEvent({ key: null, order: null, keys: [] })

		expect(replace).toHaveBeenCalled()
		const nav = replace.mock.calls[replace.mock.calls.length - 1][0]
		expect(nav.query._order).toBeUndefined()
	})

	it('preserves other existing query params when writing _order', async () => {
		const { wrapper, replace } = mountPage(
			{ title: 'Decisions', register: 'decidesk', schema: 'decision' },
			{ params: {}, query: { status: 'open' } },
		)
		await new Promise((resolve) => setTimeout(resolve))

		wrapper.vm.onSortEvent({ key: 'title', order: 'asc', keys: [{ key: 'title', order: 'asc' }] })

		const nav = replace.mock.calls[replace.mock.calls.length - 1][0]
		expect(nav.query.status).toBe('open')
		expect(JSON.parse(nav.query._order)).toEqual([{ key: 'title', order: 'asc' }])
	})
})

describe('CnIndexPage — multi-sort restored from a deep-linked route on mount', () => {
	it('seeds the initial sort state from $route.query._order', async () => {
		const { wrapper } = mountPage(
			{ title: 'Decisions', register: 'decidesk', schema: 'decision' },
			{ params: {}, query: { _order: JSON.stringify([{ key: 'status', order: 'asc' }, { key: 'createdAt', order: 'desc' }]) } },
		)
		await new Promise((resolve) => setTimeout(resolve))

		expect(wrapper.vm.list.sortKeys.value).toEqual([
			{ key: 'status', order: 'asc' },
			{ key: 'createdAt', order: 'desc' },
		])
		const firstCall = mockStore.fetchCollection.mock.calls[0][1]
		expect(firstCall._order).toEqual({ status: 'asc', createdAt: 'desc' })
	})

	it('malformed _order in the route is ignored (no crash, no initial sort)', async () => {
		const { wrapper } = mountPage(
			{ title: 'Decisions', register: 'decidesk', schema: 'decision' },
			{ params: {}, query: { _order: 'not-json{{{' } },
		)
		await new Promise((resolve) => setTimeout(resolve))

		expect(wrapper.vm.list.sortKeys.value).toEqual([])
	})

	it('falls back to the legacy sortKey/sortOrder props when no route _order is present', async () => {
		const { wrapper } = mountPage({
			title: 'Decisions', register: 'decidesk', schema: 'decision', sortKey: 'title', sortOrder: 'desc',
		})
		await new Promise((resolve) => setTimeout(resolve))

		expect(wrapper.vm.list.sortKeys.value).toEqual([{ key: 'title', order: 'desc' }])
	})
})
