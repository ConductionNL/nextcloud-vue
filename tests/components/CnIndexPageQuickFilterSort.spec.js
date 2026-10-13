/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A quick filter can set its own order (`sort`): selecting it sorts the list
 * that way, and a tab without one goes back to the page's order
 * (screens-quick-filter-sort).
 *
 * @spec openspec/changes/screens-quick-filter-sort/specs/index-page/spec.md
 */

const mockStore = {
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Task', properties: {} }),
	getSchema: jest.fn(() => ({ title: 'Task', properties: {} })),
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const { mount } = require('@vue/test-utils')
const { h } = require('vue')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

// CnIndexPage renders the quick-filter bar into CnActionsBar's `#filters`
// slot, so the auto-stub must render NAMED slots for the bar to exist at all.
// VTU v1's `true` stub rendered `$options._renderChildren`, and Vue 2.6
// compiled a scope-less `<template #filters>` into ordinary children tagged
// `slot="filters"` — so named slots came along for free. In Vue 3 every slot
// is a function on `slots`, and VTU v2's auto-stub renders the DEFAULT slot
// only (`renderStubDefaultSlot`); a `#filters` subtree silently never mounts.
const CnActionsBarStub = {
	name: 'CnActionsBar',
	setup(props, { slots }) {
		return () => h('div', { class: 'cn-actions-bar-stub' }, Object.keys(slots).map((name) => slots[name]()))
	},
}

const stubs = {
	CnDataTable: true,
	CnCardGrid: true,
	CnPagination: true,
	CnActionsBar: CnActionsBarStub,
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
	NcSelect: true,
}

/**
 * @param {object} propsData Component props.
 * @param {object} [route] Mocked `$route`.
 * @return {object} Vue Test Utils wrapper.
 */
function mountPage(propsData, route) {
	return mount(CnIndexPage, {
		propsData,
		stubs,
		mocks: { $route: route || { params: {} }, $router: { push: jest.fn() } },
	})
}

/**
 * Resolve next microtask + lib's await-then-await pattern.
 *
 * @return {Promise<void>}
 */
async function flush() {
	await new Promise((resolve) => setTimeout(resolve))
}

const { quickFilterSortKeys } = require('../../src/components/CnIndexPage/useSelfFetchList.js')

function lastOrder() {
	const calls = mockStore.fetchCollection.mock.calls
	return (calls[calls.length - 1][1] || {})._order
}

const tabs = [
	{ label: 'Komende', filter: { 'scheduledDate[gte]': '2026-10-13' }, sort: { key: 'scheduledDate', order: 'asc' }, default: true },
	{ label: 'Afgerond', filter: { lifecycle: 'closed' } },
	{ label: 'Alle', filter: {}, sort: [{ key: 'title' }, { key: 'scheduledDate', order: 'desc' }] },
]

beforeEach(() => {
	mockStore.fetchCollection.mockClear()
})

describe('quickFilterSortKeys', () => {
	it('reads one sort or a list, and nothing else', () => {
		expect(quickFilterSortKeys({ sort: { key: 'a', order: 'desc' } })).toEqual([{ key: 'a', order: 'desc' }])
		expect(quickFilterSortKeys({ sort: [{ key: 'a' }, { key: 'b', order: 'desc' }] })).toEqual([{ key: 'a', order: 'asc' }, { key: 'b', order: 'desc' }])
		expect(quickFilterSortKeys({ sort: { order: 'desc' } })).toBeNull()
		expect(quickFilterSortKeys({})).toBeNull()
		expect(quickFilterSortKeys(undefined)).toBeNull()
	})
})

describe('a quick filter with a sort', () => {
	it('orders the first fetch when it is the default tab', async () => {
		mountPage({ title: 'Meetings', register: 'decidiq', schema: 'meeting', sortKey: 'scheduledDate', sortOrder: 'desc', quickFilters: tabs })
		await flush()
		expect(lastOrder()).toEqual({ scheduledDate: 'asc' })
	})

	it('goes back to the page order for a tab without a sort, and takes the next tab\'s own', async () => {
		const wrapper = mountPage({ title: 'Meetings', register: 'decidiq', schema: 'meeting', sortKey: 'scheduledDate', sortOrder: 'desc', quickFilters: tabs })
		await flush()
		wrapper.vm.onQuickFilterChange(1)
		await flush()
		expect(lastOrder()).toEqual({ scheduledDate: 'desc' })
		wrapper.vm.onQuickFilterChange(2)
		await flush()
		expect(lastOrder()).toEqual({ title: 'asc', scheduledDate: 'desc' })
	})

	it('changes nothing for tabs without a sort', async () => {
		const plain = tabs.map(({ sort, ...tab }) => tab)
		const wrapper = mountPage({ title: 'Meetings', register: 'decidiq', schema: 'meeting', sortKey: 'title', sortOrder: 'asc', quickFilters: plain })
		await flush()
		expect(lastOrder()).toEqual({ title: 'asc' })
		wrapper.vm.list.onSort({ key: 'scheduledDate', order: 'desc' })
		await flush()
		wrapper.vm.onQuickFilterChange(1)
		await flush()
		// The person's column sort stays: no tab asked for an order.
		expect(lastOrder()).toEqual({ scheduledDate: 'desc' })
	})
})
