/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqAfdelingen draws Downloaden beside the title and the Acties menu in the
 * toolbar: `showActionsMenu` keeps the menu beside header buttons.
 *
 * @spec openspec/changes/index-actions-menu-with-header-buttons/specs/index-actions-menu-with-header-buttons/spec.md#requirement-an-index-page-decides-its-toolbar-actions-menu
 */
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const BarStub = {
	name: 'CnActionsBar',
	props: ['showActionsMenu'],
	template: '<div class="bar" :data-menu="String(showActionsMenu)" />',
}

function mountPage(extra = {}) {
	return mount(CnIndexPage, {
		propsData: { title: 'Departments', schema: { title: 'User', properties: {} }, objects: [], showTitle: true, headerButtons: [{ label: 'Download', action: 'export' }], ...extra },
		global: {
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Departments' } },
			stubs: { CnActionsBar: BarStub, CnSavedViewsControl: true, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true },
		},
	})
}

describe('CnIndexPage: showActionsMenu', () => {
	it('keeps the menu beside header buttons when true', () => {
		expect(mountPage({ showActionsMenu: true }).find('.bar').attributes('data-menu')).toBe('true')
	})

	it('derives it from the header buttons without the key', () => {
		expect(mountPage().find('.bar').attributes('data-menu')).toBe('false')
		expect(mountPage({ headerButtons: [] }).find('.bar').attributes('data-menu')).toBe('true')
	})

	it('removes it when false', () => {
		expect(mountPage({ headerButtons: [], showActionsMenu: false }).find('.bar').attributes('data-menu')).toBe('false')
	})
})
