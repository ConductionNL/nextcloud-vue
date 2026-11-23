/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `quickFilterPlacementByView` sets the quick-filter placement per view mode:
 * dossiq's case list draws the chips beside the Filter button in its board
 * and map views (DqWerkbord, DqZakenKaart) and on their own row in its table
 * and cards views (DqZaken, DqZakenSorteren). A view it does not name keeps
 * `quickFilterPlacement`.
 *
 * @spec openspec/changes/index-quick-filter-placement-per-view/specs/index-page/spec.md#requirement-the-quick-filter-placement-can-differ-per-view
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

const tabs = [
	{ label: 'All', filter: {}, default: true },
	{ label: 'Woo request', filter: { caseType: 'woo' } },
]

/**
 * @param {string} view The `_view` in the route.
 * @return {Promise<object>} The page.
 */
async function pageIn(view) {
	const wrapper = mountPage({
		title: 'Cases',
		register: 'dossiq',
		schema: 'case',
		quickFilters: tabs,
		viewModes: ['table', 'cards', 'map'],
		quickFilterPlacementByView: { map: 'toolbar' },
	}, { params: {}, query: view ? { _view: view } : {} })
	await flush()
	return wrapper
}

describe('quickFilterPlacementByView', () => {
	it('uses the placement the view names', async () => {
		const wrapper = await pageIn('map')
		expect(wrapper.classes()).toContain('cn-index-page--quick-filters-toolbar')
		expect(wrapper.findComponent({ name: 'CnQuickFilterBar' }).props('fit')).toBe(true)
	})

	it('keeps quickFilterPlacement in a view it does not name', async () => {
		const wrapper = await pageIn('')
		expect(wrapper.classes()).not.toContain('cn-index-page--quick-filters-toolbar')
		expect(wrapper.findComponent({ name: 'CnQuickFilterBar' }).props('fit')).toBe(false)
	})
})
