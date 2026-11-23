/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * `quickFilterPlacement: "row"` puts the quick-filter chips on a row of their
 * own above the toolbar, wrapping onto more lines instead of folding into an
 * overflow chip (board DqTeamwachtrij).
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
	{ label: 'Objection', filter: { caseType: 'bezwaar' } },
]

/**
 * @param {string} placement The placement.
 * @return {Promise<object>} The page.
 */
async function pageWith(placement) {
	const wrapper = mountPage({ title: 'Team queue', register: 'dossiq', schema: 'case', quickFilters: tabs, quickFilterPlacement: placement })
	await flush()
	return wrapper
}

describe('quickFilterPlacement row', () => {
	it('draws the chips in their own row before the toolbar', async () => {
		const wrapper = await pageWith('row')
		const row = wrapper.find('[data-testid="cn-index-page-quick-filter-row"]')
		expect(row.exists()).toBe(true)
		expect(row.findComponent({ name: 'CnQuickFilterBar' }).exists()).toBe(true)
		expect(wrapper.find('.cn-actions-bar-stub').findComponent({ name: 'CnQuickFilterBar' }).exists()).toBe(false)
		expect(row.element.compareDocumentPosition(wrapper.find('.cn-actions-bar-stub').element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
	})

	it('lets the chips wrap rather than fit one line', async () => {
		const wrapper = await pageWith('row')
		expect(wrapper.findComponent({ name: 'CnQuickFilterBar' }).props('fit')).toBe(false)
	})

	it('keeps the chips in the toolbar otherwise', async () => {
		const wrapper = await pageWith('')
		expect(wrapper.find('[data-testid="cn-index-page-quick-filter-row"]').exists()).toBe(false)
		expect(wrapper.find('.cn-actions-bar-stub').findComponent({ name: 'CnQuickFilterBar' }).exists()).toBe(true)
	})
})
