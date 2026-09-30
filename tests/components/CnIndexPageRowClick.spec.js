/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A row click either opens the row or selects it, never nothing: a page
 * without selection opens, and a page with nothing to open selects.
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

describe('CnIndexPage row click', () => {
	it('opens the row when rowClickToView is set and a row-click listener exists', () => {
		const onRowClick = jest.fn()
		const w = mountIndex({ rowClickToView: true }, { onRowClick })

		w.vm.onRowClick(ROW)

		expect(onRowClick).toHaveBeenCalledWith(ROW)
		expect(w.vm.internalSelectedIds).toEqual([])
	})

	it('selects the row when rowClickToView is set but nothing listens for row-click', () => {
		const w = mountIndex({ rowClickToView: true })

		w.vm.onRowClick(ROW)

		expect(w.vm.rowClickOpens).toBe(false)
		expect(w.vm.internalSelectedIds).toEqual(['row-1'])
	})

	it('opens the row when selection is disabled, even without rowClickToView', () => {
		const onRowClick = jest.fn()
		const w = mountIndex({ selectable: false }, { onRowClick })

		w.vm.onRowClick(ROW)

		expect(onRowClick).toHaveBeenCalledWith(ROW)
	})

	it('selects the row when rowClickToView is off', () => {
		const onRowClick = jest.fn()
		const w = mountIndex({}, { onRowClick })

		w.vm.onRowClick(ROW)

		expect(onRowClick).not.toHaveBeenCalled()
		expect(w.vm.internalSelectedIds).toEqual(['row-1'])
	})

	it('passes the native event on as the second row-click argument', () => {
		const onRowClick = jest.fn()
		const w = mountIndex({ selectable: false }, { onRowClick })
		const event = new MouseEvent('auxclick', { button: 1 })

		w.vm.onRowClick(ROW, event)

		expect(onRowClick).toHaveBeenCalledWith(ROW, event)
	})

	it('does not toggle selection on a middle click', () => {
		const w = mountIndex({})

		w.vm.onRowClick(ROW, new MouseEvent('auxclick', { button: 1 }))

		expect(w.vm.internalSelectedIds).toEqual([])
	})

	it('picks the native event out of a custom card component click', () => {
		const w = mountIndex({})
		const event = new MouseEvent('click')

		expect([ROW, event].find(w.vm.isDomEvent)).toBe(event)
		expect([ROW].find(w.vm.isDomEvent)).toBeUndefined()
	})
})
