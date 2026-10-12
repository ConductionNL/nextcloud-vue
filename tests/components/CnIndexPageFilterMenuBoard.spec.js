/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `filterMenu` under the board look draws the board's Filter button in the
 * toolbar, as a menu of each enum column's values. Without the look the funnel
 * stays in the table header.
 */
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const NcActionsStub = {
	props: ['menuName'],
	template: '<div class="nc-actions" :data-name="menuName"><slot /></div>',
}

function mountPage(extra = {}, look = 'board') {
	return mount(CnIndexPage, {
		propsData: {
			title: 'Accounts',
			schema: { title: 'Account', titlePlural: 'Accounts', properties: { status: { title: 'Status', enum: ['active', 'suspended'] } } },
			columns: [{ key: 'status', label: 'Status' }],
			objects: [{ id: 1, status: 'active' }],
			pagination: { page: 1, pages: 1, total: 1, limit: 20 },
			filterMenu: true,
			...extra,
		},
		global: {
			provide: { cnLook: look },
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Accounts' } },
			stubs: {
				NcActions: NcActionsStub,
				NcActionCheckbox: { template: '<label class="check"><slot /></label>' },
				NcActionCaption: { template: '<span class="caption" />' },
				CnSavedViewsControl: true,
				CnBuildiqEditButton: true,
				CnDataTable: true,
				CnCardGrid: true,
				CnPagination: true,
				CnContextMenu: true,
				CnRowActions: true,
				CnIndexSidebar: true,
			},
		},
	})
}

describe('CnIndexPage filterMenu under the board look', () => {
	it('draws a labelled Filter button with the facet values in the toolbar', () => {
		const w = mountPage()
		const menu = w.find('[data-testid="cn-index-filter-menu"]')
		expect(menu.exists()).toBe(true)
		expect(menu.attributes('data-name')).toBe('Filter')
		expect(menu.findAll('.check').map((c) => c.text())).toEqual(['active', 'suspended'])
		expect(w.vm.showHeaderFilterMenu).toBe(false)
	})

	it('draws nothing in the toolbar without filterMenu', () => {
		expect(mountPage({ filterMenu: false }).find('[data-testid="cn-index-filter-menu"]').exists()).toBe(false)
	})

	it('draws nothing in the toolbar when there is nothing to filter by', () => {
		const w = mountPage({ schema: { title: 'Account', properties: { name: { title: 'Name' } } }, columns: [{ key: 'name', label: 'Name' }] })
		expect(w.find('[data-testid="cn-index-filter-menu"]').exists()).toBe(false)
	})

	it('keeps the funnel in the table header without the look', () => {
		const w = mountPage({}, 'nextcloud')
		expect(w.find('[data-testid="cn-index-filter-menu"]').exists()).toBe(false)
		expect(w.vm.showHeaderFilterMenu).toBe(true)
	})
})
