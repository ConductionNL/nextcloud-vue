/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A scope's own folder filter (`?caseType=<id>` on DqWooVerzoeken) adds no
 * column back to the scope's columns and draws no header-filter summary
 * chip in the table: the Active chip already names it.
 */

const mockStore = {
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Case', properties: { title: { type: 'string' }, caseType: { type: 'string', facetable: true, title: 'Type' }, status: { type: 'string', facetable: true } } }),
	getSchema: jest.fn(() => ({ title: 'Case', properties: { title: { type: 'string' }, caseType: { type: 'string', facetable: true, title: 'Type' }, status: { type: 'string', facetable: true } } })),
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
	CnDataTable: { name: 'CnDataTable', props: ['columns', 'activeFilters'], template: '<div class="table-stub" />' },
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

const columns = [
	{ key: 'title', label: 'Case' },
	{ key: 'caseType', label: 'Type' },
	{ key: 'status', label: 'Status' },
]
const folders = [{ id: 'woo', name: 'Woo', columns: ['title', 'status'] }]

beforeEach(() => {
	mockStore.fetchCollection.mockClear()
})

/**
 * @return {Promise<object>} The page, scoped to the Woo folder.
 */
async function scopedPage() {
	const wrapper = mountPage({ title: 'Cases', register: 'dossiq', schema: 'case', columns, viewMode: 'table', folderSidebar: { source: 'custom', filterField: 'caseType', folders, pane: false } })
	await flush()
	wrapper.vm.onFolderSelect('woo')
	await flush()
	return wrapper
}

describe('a scope and its own folder filter', () => {
	it('shows the scope columns without the folder field', async () => {
		const wrapper = await scopedPage()
		expect(wrapper.vm.tableColumns.map((c) => (typeof c === 'string' ? c : c.key))).toEqual(['title', 'status'])
	})

	it('gives the table no filter for the folder field', async () => {
		const wrapper = await scopedPage()
		expect(Object.keys(wrapper.vm.tableActiveFilters)).not.toContain('caseType')
		expect(wrapper.vm.effectiveActiveFilters.caseType).toEqual(['woo'])
	})

	it('keeps a column filter the person set on another field', async () => {
		const wrapper = await scopedPage()
		wrapper.vm.onFilterEvent({ key: 'status', values: ['open'] })
		await flush()
		expect(wrapper.vm.tableActiveFilters).toMatchObject({ status: ['open'] })
	})
})
