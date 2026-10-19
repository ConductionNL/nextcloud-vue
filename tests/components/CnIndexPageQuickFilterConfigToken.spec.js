/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A quick filter can name the configured municipality with `@config.<key>`,
 * in its label and in its filter (board DqContacten: "Woonplaats
 * Zuiddrecht"). The page takes the app config as `appConfig`, as the
 * dashboard and detail pages do.
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

function lastParams() {
	const calls = mockStore.fetchCollection.mock.calls
	return calls[calls.length - 1][1] || {}
}

const tabs = [
	{ label: 'All', filter: {}, default: true },
	{ label: 'Residence @config.municipality', activeLabel: 'Residence: @config.municipality', filter: { city: '@config.municipality' } },
]

beforeEach(() => {
	mockStore.fetchCollection.mockClear()
})

describe('a quick filter naming @config.<key>', () => {
	it('shows the configured value in the label', async () => {
		const wrapper = mountPage({ title: 'Contacts', register: 'dossiq', schema: 'contact', quickFilters: tabs, appConfig: { municipality: 'Zuiddrecht' } })
		await flush()
		expect(wrapper.vm.effectiveQuickFilters.map((tab) => tab.label)).toEqual(['All', 'Residence Zuiddrecht'])
		expect(wrapper.vm.effectiveQuickFilters[1].activeLabel).toBe('Residence: Zuiddrecht')
	})

	it('filters on the configured value', async () => {
		const wrapper = mountPage({ title: 'Contacts', register: 'dossiq', schema: 'contact', quickFilters: tabs, appConfig: { municipality: 'Zuiddrecht' } })
		await flush()
		wrapper.vm.onQuickFilterChange(1)
		await flush()
		expect(lastParams().city).toBe('Zuiddrecht')
	})

	it('translates the label before the value goes in', async () => {
		const wrapper = mount(CnIndexPage, {
			propsData: { title: 'Contacts', register: 'dossiq', schema: 'contact', quickFilters: tabs, appConfig: { municipality: 'Zuiddrecht' } },
			stubs,
			global: { provide: { cnTranslate: (s) => (s === 'Residence @config.municipality' ? 'Woonplaats @config.municipality' : s) } },
			mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn(), replace: jest.fn(async () => {}) } },
		})
		await flush()
		expect(wrapper.vm.effectiveQuickFilters[1].label).toBe('Woonplaats Zuiddrecht')
	})

	it('leaves the token in place when the config does not hold the key', async () => {
		const wrapper = mountPage({ title: 'Contacts', register: 'dossiq', schema: 'contact', quickFilters: tabs })
		await flush()
		expect(wrapper.vm.effectiveQuickFilters[1].label).toBe('Residence @config.municipality')
	})
})
