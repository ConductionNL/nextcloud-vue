/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A row that opens somewhere is a real link in the table: reachable with
 * Tab, announced as a link with the row's name, and openable in a new tab.
 * Without it a keyboard or screen reader user can only open a row through
 * its Actions menu (WCAG 2.1.1, 2.4.4).
 */

const { mount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const stubs = {
	CnCardGrid: true,
	CnPagination: true,
	CnContextMenu: true,
	CnRowActions: true,
	CnIndexSidebar: true,
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
	CnDataTable: {
		name: 'CnDataTable',
		props: ['rowClickRoute', 'rowClickToView'],
		template: '<div class="table-stub" />',
	},
}

const ROW = { id: 'row-1', title: 'A row' }

function mountIndex(props = {}, attrs = {}) {
	return mount(CnIndexPage, {
		props: {
			title: 'Rows',
			schema: { title: 'Row', properties: { title: { type: 'string' } } },
			objects: [ROW],
			loading: false,
			...props,
		},
		attrs,
		global: {
			stubs,
			mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn() } },
		},
	})
}

describe('CnIndexPage row link', () => {
	it('gives the table the row target as its row link when a row click opens it', () => {
		const viewTo = jest.fn((row) => ({ name: 'RowDetail', params: { id: row.id } }))
		const w = mountIndex({ rowClickToView: true, viewTo }, { onRowClick: jest.fn() })

		const route = w.findComponent({ name: 'CnDataTable' }).props('rowClickRoute')
		expect(typeof route).toBe('function')
		expect(route(ROW)).toEqual({ name: 'RowDetail', params: { id: 'row-1' } })
	})

	it('gives no row link when a row click selects instead', () => {
		const viewTo = jest.fn(() => ({ name: 'RowDetail', params: { id: 'row-1' } }))
		const w = mountIndex({ rowClickToView: false, viewTo }, { onRowClick: jest.fn() })

		expect(w.findComponent({ name: 'CnDataTable' }).props('rowClickRoute')).toBeFalsy()
	})

	it('gives no row link without a target', () => {
		const w = mountIndex({ rowClickToView: true }, { onRowClick: jest.fn() })

		expect(w.findComponent({ name: 'CnDataTable' }).props('rowClickRoute')).toBeFalsy()
	})
})
