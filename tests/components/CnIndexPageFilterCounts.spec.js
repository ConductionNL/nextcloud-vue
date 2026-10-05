/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * `CnIndexPage` fetches record counts for the quick filters that set
 * `showCount`, and makes no count request for the ones that do not.
 *
 * `fetchFilterCounts` is tested on its own (one grouped request for filters
 * on the same field). What is tested here is the wiring a unit test of the
 * helper cannot see: that the page calls it at all, with the resolved filters,
 * only for entries that opted in, and that the numbers reach the chips.
 *
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-counts-on-filters-and-views
 */

const mockFetchFilterCounts = jest.fn()

jest.mock('../../src/utils/fetchFilterCounts.js', () => ({
	__esModule: true,
	fetchFilterCounts: (...args) => mockFetchFilterCounts(...args),
}))

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

beforeEach(() => {
	mockStore.registerObjectType.mockClear()
	mockStore.fetchCollection.mockClear()
	mockStore.fetchSchema.mockClear()
	mockFetchFilterCounts.mockReset()
	mockFetchFilterCounts.mockResolvedValue({})
})

const counts = (wrapper) => wrapper.findAll('[data-testid="cn-quick-filter-count"]').map((count) => count.text())

describe('CnIndexPage counts on quick filters', () => {
	it('makes no count request when no quick filter asks for one', async () => {
		const wrapper = mountPage({
			title: 'Cases',
			register: 'dossiq',
			schema: 'case',
			quickFilters: [
				{ label: 'Open', filter: { status: 'open' }, default: true },
				{ label: 'Closed', filter: { status: 'closed' } },
			],
		})
		await flush()
		expect(mockFetchFilterCounts).not.toHaveBeenCalled()
		expect(counts(wrapper)).toEqual([])
	})

	it('asks for the counts of the filters that opted in, and only those', async () => {
		mockFetchFilterCounts.mockResolvedValue({ 'tab:0': 12, 'tab:2': 0 })
		const wrapper = mountPage({
			title: 'Cases',
			register: 'dossiq',
			schema: 'case',
			filter: { caseType: 'woo' },
			quickFilters: [
				{ label: 'Open', filter: { status: 'open' }, default: true, showCount: true },
				{ label: 'Closed', filter: { status: 'closed' } },
				{ label: 'On hold', filter: { status: 'hold' }, showCount: true },
			],
		})
		await flush()

		expect(mockFetchFilterCounts).toHaveBeenCalledTimes(1)
		const request = mockFetchFilterCounts.mock.calls[0][0]
		expect(request.register).toBe('dossiq')
		expect(request.schema).toBe('case')
		expect(request.baseFilter).toEqual({ caseType: 'woo' })
		expect(request.entries).toEqual([
			{ key: 'tab:0', filter: { status: 'open' } },
			{ key: 'tab:2', filter: { status: 'hold' } },
		])

		const tabs = wrapper.findAll('[role="tab"]')
		expect(tabs[0].find('[data-testid="cn-quick-filter-count"]').text()).toBe('12')
		expect(tabs[1].find('[data-testid="cn-quick-filter-count"]').exists()).toBe(false)
		expect(tabs[2].find('[data-testid="cn-quick-filter-count"]').text()).toBe('0')
	})

	it('resolves route tokens in a counted filter before it asks', async () => {
		mountPage({
			title: 'Cases',
			register: 'dossiq',
			schema: 'case',
			quickFilters: [{ label: 'This client', filter: { client: '@route.clientId' }, showCount: true }],
		}, { params: { clientId: 'c-42' } })
		await flush()
		expect(mockFetchFilterCounts.mock.calls[0][0].entries).toEqual([{ key: 'tab:0', filter: { client: 'c-42' } }])
	})

	it('shows the chips without a number when the count request yields nothing', async () => {
		mockFetchFilterCounts.mockResolvedValue({})
		const wrapper = mountPage({
			title: 'Cases',
			register: 'dossiq',
			schema: 'case',
			quickFilters: [{ label: 'Open', filter: { status: 'open' }, showCount: true }],
		})
		await flush()
		expect(wrapper.findAll('[role="tab"]')).toHaveLength(1)
		expect(counts(wrapper)).toEqual([])
	})

	it('makes no count request without a register and schema to count in', async () => {
		mountPage({
			title: 'Cases',
			objects: [],
			schema: { title: 'Case', properties: {} },
			quickFilters: [{ label: 'Open', filter: { status: 'open' }, showCount: true }],
		})
		await flush()
		expect(mockFetchFilterCounts).not.toHaveBeenCalled()
	})
})
