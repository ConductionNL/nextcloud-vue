/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Sorting an index page (Ruben, 19 Oct): in the table view only through the
 * column headers; in the list, card and map views through a Sort section in
 * the index sidebar (field, direction, the current order). The toolbar sort
 * select is gone; `sortSelectOptions` feeds the sidebar section instead and
 * `defaultOrder` keeps working.
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
	props: ['showSortSelect'],
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

const CnIndexSidebar = require('../../src/components/CnIndexSidebar/CnIndexSidebar.vue').default

function lastOrder() {
	const calls = mockStore.fetchCollection.mock.calls
	return (calls[calls.length - 1][1] || {})._order
}

const columns = [
	{ key: 'title', label: 'Title', sortable: true },
	{ key: 'createdAt', label: 'Created', sortable: true },
	{ key: 'notes', label: 'Notes', sortable: false },
]

beforeEach(() => {
	mockStore.fetchCollection.mockClear()
})

describe('the toolbar sort select is gone', () => {
	it('never asks the actions bar for a sort select', async () => {
		const wrapper = mountPage({ title: 'Cases', register: 'dossiq', schema: 'case', showSortSelect: true, sortSelectOptions: [{ value: 'title', label: 'Title' }] })
		await flush()
		const bar = wrapper.findComponent({ name: 'CnActionsBar' })
		expect(bar.props('showSortSelect')).toBeFalsy()
	})
})

describe('the sidebar sort section', () => {
	it('offers the sortable columns in a list view, and none in the table view', async () => {
		const wrapper = mountPage({ title: 'Cases', register: 'dossiq', schema: 'case', columns, viewMode: 'cards' })
		await flush()
		expect(wrapper.vm.sidebarSortOptions.map((o) => o.label)).toEqual(['Title', 'Created'])
		wrapper.vm.currentViewMode = 'table'
		await flush()
		expect(wrapper.vm.sidebarSortOptions).toEqual([])
	})

	it('takes sortSelectOptions when the page declares them', async () => {
		const wrapper = mountPage({ title: 'Cases', register: 'dossiq', schema: 'case', columns, viewMode: 'cards', sortSelectOptions: [{ value: 'urgent', label: 'Most urgent', order: { priority: 'desc', dueDate: 'asc' } }] })
		await flush()
		expect(wrapper.vm.sidebarSortOptions).toEqual([{ value: 'urgent', label: 'Most urgent', keys: [{ key: 'priority', order: 'desc' }, { key: 'dueDate', order: 'asc' }] }])
	})

	it('sorts the list as a header click does', async () => {
		const wrapper = mountPage({ title: 'Cases', register: 'dossiq', schema: 'case', columns, viewMode: 'cards', defaultOrder: '-createdAt' })
		await flush()
		expect(lastOrder()).toEqual({ createdAt: 'desc' })
		wrapper.vm.onSidebarSortChange([{ key: 'title', order: 'asc' }])
		await flush()
		expect(lastOrder()).toEqual({ title: 'asc' })
		expect(wrapper.vm.currentSortKeys).toEqual([{ key: 'title', order: 'asc' }])
	})
})

describe('CnIndexSidebar sort section', () => {
	const options = [
		{ value: 'title', label: 'Title', keys: [{ key: 'title', order: 'asc' }] },
		{ value: 'createdAt', label: 'Created', keys: [{ key: 'createdAt', order: 'asc' }] },
	]

	function mountSidebar(props) {
		return mount(CnIndexSidebar, {
			props: { open: true, sortOptions: options, ...props },
			global: {
				stubs: {
					NcAppSidebar: { template: '<div><slot /></div>' },
					NcAppSidebarTab: { template: '<div><slot /></div>' },
					NcSelect: { name: 'NcSelect', props: ['modelValue', 'options', 'inputLabel'], emits: ['update:modelValue'], template: '<div class="select" :data-label="inputLabel" />' },
					NcCheckboxRadioSwitch: { name: 'NcCheckboxRadioSwitch', props: ['modelValue', 'value', 'type'], emits: ['update:modelValue'], template: '<label class="radio" :data-value="value"><slot /></label>' },
				},
			},
		})
	}

	it('shows the field, the direction and the current order', () => {
		const w = mountSidebar({ currentSort: [{ key: 'createdAt', order: 'desc' }] })
		const section = w.find('[data-testid="cn-index-sidebar-sort"]')
		expect(section.exists()).toBe(true)
		const field = w.findAllComponents({ name: 'NcSelect' }).find((s) => s.props('inputLabel') === 'Sort by')
		expect(field.props('modelValue')).toEqual(expect.objectContaining({ value: 'createdAt' }))
		expect(w.vm.sortDirection).toBe('desc')
		expect(section.find('[data-testid="cn-index-sidebar-sort-current"]').text()).toBe('Current order: Created, descending')
	})

	it('emits the new order on a field or direction change', () => {
		const w = mountSidebar({ currentSort: [{ key: 'createdAt', order: 'desc' }] })
		w.vm.onSortField({ value: 'title' })
		expect(w.emitted('sort-change').at(-1)[0]).toEqual([{ key: 'title', order: 'desc' }])
		w.vm.onSortDirection('asc')
		expect(w.emitted('sort-change').at(-1)[0]).toEqual([{ key: 'createdAt', order: 'asc' }])
	})

	it('draws no section without options', () => {
		expect(mountSidebar({ sortOptions: [] }).find('[data-testid="cn-index-sidebar-sort"]').exists()).toBe(false)
	})
})
