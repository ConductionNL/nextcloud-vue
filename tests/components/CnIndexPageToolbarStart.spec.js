/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * DqAanMijToegewezen draws the team's name chips at the start of the toolbar
 * row, beside Filter and the view switch, and its one quick filter ("Inclusief
 * werk waarvoor u waarneemt") only on the Active line. The `toolbar-start`
 * slot is that row's start; `quickFilterPlacement: "active"` draws no tabs.
 *
 * @spec openspec/changes/index-toolbar-start-and-active-only-quick-filters/specs/index-page/spec.md#requirement-a-page-can-put-its-own-controls-at-the-start-of-the-toolbar-row
 * @spec openspec/changes/index-toolbar-start-and-active-only-quick-filters/specs/index-page/spec.md#requirement-quick-filters-can-show-only-on-the-active-line
 */

const mockStore = {
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Case', properties: {} }),
	getSchema: jest.fn(() => ({ title: 'Case', properties: {} })),
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const { mount } = require('@vue/test-utils')
const { h } = require('vue')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

// VTU v2's auto-stub renders the default slot only, so the bar's named slots
// are drawn by hand, each in a wrapper named after the slot.
const CnActionsBarStub = {
	name: 'CnActionsBar',
	setup(props, { slots }) {
		return () => h('div', { class: 'cn-actions-bar-stub' }, Object.keys(slots).map((name) => h('div', { class: `slot-${name}` }, slots[name]())))
	},
}

const CnQuickFilterBarStub = {
	name: 'CnQuickFilterBar',
	setup() {
		return () => h('span', { class: 'quick-filters' })
	},
}

const stubs = {
	CnQuickFilterBar: CnQuickFilterBarStub,
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

const tabs = [
	{ label: 'Including work you cover', activeLabel: 'Including work you cover', filter: { isDraft: false }, default: true },
]

/**
 * @param {object} props Extra props.
 * @param {object} [slots] Slots handed to the page.
 * @return {Promise<object>} The mounted page.
 */
async function pageWith(props, slots = {}) {
	const wrapper = mount(CnIndexPage, {
		propsData: { title: 'Assigned to me', register: 'dossiq', schema: 'case', quickFilters: tabs, ...props },
		slots,
		stubs,
		mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn(), replace: jest.fn(async () => {}) } },
	})
	await new Promise((resolve) => setTimeout(resolve))
	return wrapper
}

const teamChips = { 'toolbar-start': () => h('span', { class: 'team-chips' }, 'Pieter Jansen (you)') }

describe('the toolbar-start slot', () => {
	it('draws the page\'s controls at the start of the toolbar row, before the quick filters', async () => {
		const wrapper = await pageWith({ quickFilters: [{ label: 'All', filter: {}, default: true }, ...tabs] }, teamChips)
		const filters = wrapper.find('.slot-filters')
		expect(filters.exists()).toBe(true)
		const chips = filters.find('.team-chips')
		expect(chips.exists()).toBe(true)
		const bar = filters.findComponent({ name: 'CnQuickFilterBar' })
		expect(bar.exists()).toBe(true)
		expect(chips.element.compareDocumentPosition(bar.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
	})

	it('fills the row start on a page without quick filters', async () => {
		const wrapper = await pageWith({ quickFilters: [] }, teamChips)
		expect(wrapper.find('.slot-filters .team-chips').exists()).toBe(true)
	})
})

describe('quickFilterPlacement active', () => {
	it('draws no tabs, in the toolbar or on a row of their own', async () => {
		const wrapper = await pageWith({ quickFilterPlacement: 'active' })
		expect(wrapper.findComponent({ name: 'CnQuickFilterBar' }).exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-index-page-quick-filter-row"]').exists()).toBe(false)
	})

	it('keeps the chosen tab on the Active line, where it can be removed', async () => {
		const wrapper = await pageWith({ quickFilterPlacement: 'active' })
		expect(wrapper.vm.quickFilterActiveChips.map((chip) => chip.label)).toEqual(['Including work you cover'])
	})

	it('draws the toolbar-start controls alone', async () => {
		const wrapper = await pageWith({ quickFilterPlacement: 'active' }, teamChips)
		expect(wrapper.find('.slot-filters .team-chips').exists()).toBe(true)
		expect(wrapper.findComponent({ name: 'CnQuickFilterBar' }).exists()).toBe(false)
	})
})
