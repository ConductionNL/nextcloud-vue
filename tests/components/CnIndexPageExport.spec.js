/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnIndexPage's native Export menu (cnindexpage-export-action):
 * opt-in via `allowExport` + schema `exportable: true`, navigates to
 * OpenRegister's export leaf with the current route's query params passed
 * through as filters.
 *
 * CnActionsBar is mounted for real (not stubbed) so the `#actions` slot —
 * where the Export menu lives — actually renders; its own `@nextcloud/vue`
 * children (NcActions/NcActionButton) resolve to the shared jest mock at
 * tests/__mocks__/nextcloud-vue.js, which flattens slots into plain divs.
 */

const { mount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const stubs = {
	CnDataTable: true,
	CnCardGrid: true,
	CnPagination: true,
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
	CnIcon: true,
}

const exportableSchema = { slug: 'case', title: 'Case', exportable: true, properties: {} }

function mountPage(propsData, routeQuery = {}) {
	return mount(CnIndexPage, {
		propsData: { title: 'Cases', register: 'procest', objects: [], ...propsData },
		stubs,
		mocks: { $route: { params: {}, query: routeQuery }, $router: { push: jest.fn() } },
	})
}

describe('CnIndexPage — native Export menu', () => {
	let assignSpy

	beforeEach(() => {
		assignSpy = jest.fn()
		delete window.location
		window.location = { pathname: '/', assign: assignSpy }
	})

	it('does not render the Export menu when allowExport is unset (default false)', () => {
		const wrapper = mountPage({ schema: exportableSchema })
		expect(wrapper.find('[data-testid="cn-index-export-menu"]').exists()).toBe(false)
	})

	it('does not render the Export menu when allowExport is true but the schema is not exportable', () => {
		const wrapper = mountPage({ schema: { slug: 'case', properties: {} }, allowExport: true })
		expect(wrapper.find('[data-testid="cn-index-export-menu"]').exists()).toBe(false)
	})

	it('renders the Export menu with CSV and Excel entries when allowExport + schema.exportable are both true', () => {
		const wrapper = mountPage({ schema: exportableSchema, allowExport: true })
		expect(wrapper.find('[data-testid="cn-index-export-menu"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-index-export-csv"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-index-export-excel"]').exists()).toBe(true)
	})

	it('navigates to the CSV export URL with route-query filters on click', async () => {
		const wrapper = mountPage({ schema: exportableSchema, allowExport: true }, { status: 'open', assignee: 'me' })
		await wrapper.find('[data-testid="cn-index-export-csv"]').trigger('click')
		expect(assignSpy).toHaveBeenCalledWith(
			'/apps/openregister/api/objects/procest/case/export?format=csv&status=open&assignee=me',
		)
	})

	it('navigates to the Excel export URL on click', async () => {
		const wrapper = mountPage({ schema: exportableSchema, allowExport: true })
		await wrapper.find('[data-testid="cn-index-export-excel"]').trigger('click')
		expect(assignSpy).toHaveBeenCalledWith(
			'/apps/openregister/api/objects/procest/case/export?format=excel',
		)
	})
})
