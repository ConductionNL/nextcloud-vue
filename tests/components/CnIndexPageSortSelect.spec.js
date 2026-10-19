/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A self-fetch index page orders by `config.defaultOrder` until the address
 * or a choice says otherwise, and its sort select (`config.sortSelectOptions`)
 * applies the chosen order as `_order`, as a header click does. Needed before
 * DqTeamWachtrij can drop its table header without losing its sort.
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
		mocks: { $route: route || { params: {}, query: {} }, $router: { push: jest.fn(), replace: jest.fn(async () => {}) } },
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

const { orderToSortKeys } = require('../../src/utils/sortOrder.js')

function lastOrder() {
	const calls = mockStore.fetchCollection.mock.calls
	return (calls[calls.length - 1][1] || {})._order
}

const options = [
	{ value: '-createdAt', label: 'Newest first' },
	{ value: 'title', label: 'Title' },
	{ value: 'urgent', label: 'Most urgent', order: { priority: 'desc', dueDate: 'asc' } },
]

beforeEach(() => {
	mockStore.fetchCollection.mockClear()
})

describe('orderToSortKeys', () => {
	it('reads a field, a minus for descending, a list and an order map', () => {
		expect(orderToSortKeys('title')).toEqual([{ key: 'title', order: 'asc' }])
		expect(orderToSortKeys('-createdAt')).toEqual([{ key: 'createdAt', order: 'desc' }])
		expect(orderToSortKeys('priority:desc,title')).toEqual([{ key: 'priority', order: 'desc' }, { key: 'title', order: 'asc' }])
		expect(orderToSortKeys({ priority: 'desc', title: 'asc' })).toEqual([{ key: 'priority', order: 'desc' }, { key: 'title', order: 'asc' }])
		expect(orderToSortKeys([{ key: 'a' }])).toEqual([{ key: 'a', order: 'asc' }])
		expect(orderToSortKeys('')).toEqual([])
		expect(orderToSortKeys(null)).toEqual([])
	})
})

describe('config.defaultOrder', () => {
	it('orders the first fetch', async () => {
		mountPage({ title: 'Queue', register: 'dossiq', schema: 'case', defaultOrder: '-createdAt' })
		await flush()
		expect(lastOrder()).toEqual({ createdAt: 'desc' })
	})

	it('gives way to an order in the address', async () => {
		mountPage({ title: 'Queue', register: 'dossiq', schema: 'case', defaultOrder: '-createdAt' }, { params: {}, query: { _order: JSON.stringify([{ key: 'title', order: 'asc' }]) } })
		await flush()
		expect(lastOrder()).toEqual({ title: 'asc' })
	})
})

describe('the sort select', () => {
	it('applies the chosen option as _order and shows it as chosen', async () => {
		const wrapper = mountPage({ title: 'Queue', register: 'dossiq', schema: 'case', showSortSelect: true, sortSelectOptions: options, defaultOrder: '-createdAt' })
		await flush()
		expect(wrapper.vm.effectiveSortSelectValue).toBe('-createdAt')

		wrapper.vm.onSortSelectChange('title')
		await flush()
		expect(lastOrder()).toEqual({ title: 'asc' })
		expect(wrapper.vm.effectiveSortSelectValue).toBe('title')
		expect(wrapper.emitted('sort-change').at(-1)).toEqual(['title'])

		wrapper.vm.onSortSelectChange('urgent')
		await flush()
		expect(lastOrder()).toEqual({ priority: 'desc', dueDate: 'asc' })
		expect(wrapper.vm.effectiveSortSelectValue).toBe('urgent')
	})

	it('shows a header-click order that matches an option as that option', async () => {
		const wrapper = mountPage({ title: 'Queue', register: 'dossiq', schema: 'case', showSortSelect: true, sortSelectOptions: options })
		await flush()
		wrapper.vm.onSortEvent({ key: 'createdAt', order: 'desc' })
		await flush()
		expect(wrapper.vm.effectiveSortSelectValue).toBe('-createdAt')
	})

	it('keeps a controlled sortSelectValue', async () => {
		const wrapper = mountPage({ title: 'Queue', register: 'dossiq', schema: 'case', showSortSelect: true, sortSelectOptions: options, sortSelectValue: 'title' })
		await flush()
		expect(wrapper.vm.effectiveSortSelectValue).toBe('title')
	})
})
