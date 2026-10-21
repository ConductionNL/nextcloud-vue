/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `embedded`: an index page on a page without a router (an app's admin
 * settings page). Opening a row never navigates: it opens `rowModal`
 * through the host's `cnOpenModal`, else the built-in form dialog on the row.
 *
 * @spec openspec/changes/index-page-embedded/specs/index-page/spec.md#requirement-an-embedded-index-page-opens-rows-in-place
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

const ROW = { id: 'r-1', name: 'Cashier' }

function mountIndex({ props = {}, openModal = null } = {}) {
	return mount(CnIndexPage, {
		props: {
			title: 'POS roles',
			schema: { title: 'Role', properties: { name: { type: 'string' } } },
			objects: [ROW],
			loading: false,
			embedded: true,
			...props,
		},
		global: {
			stubs,
			provide: openModal ? { cnOpenModal: openModal } : {},
		},
	})
}

describe('CnIndexPage embedded', () => {
	it('opens rowModal on a row through the host, with the row', () => {
		const openModal = jest.fn()
		const wrapper = mountIndex({ props: { rowModal: 'PosStaffForm', rowModalProps: { mode: 'edit' } }, openModal })

		wrapper.vm.onRowClick(ROW)

		expect(openModal).toHaveBeenCalledWith('PosStaffForm', { mode: 'edit', objectId: 'r-1', object: ROW })
		expect(wrapper.emitted('row-click')).toBeUndefined()
	})

	it('opens the built-in form dialog on the row without rowModal', async () => {
		const wrapper = mountIndex({ openModal: jest.fn() })

		wrapper.vm.onRowClick(ROW)
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.showFormDialogVisible).toBe(true)
		expect(wrapper.vm.editItem).toEqual(ROW)
	})

	it('opens a row from the View action the same way', () => {
		const openModal = jest.fn()
		const wrapper = mountIndex({ props: { rowModal: 'PosStaffForm' }, openModal })

		wrapper.vm.onView(ROW)

		expect(openModal).toHaveBeenCalledWith('PosStaffForm', { objectId: 'r-1', object: ROW })
	})

	it('opens a row on a click even when the page is selectable', () => {
		const openModal = jest.fn()
		const wrapper = mountIndex({ props: { rowModal: 'PosStaffForm', selectable: true }, openModal })

		wrapper.vm.onRowClick(ROW)

		expect(openModal).toHaveBeenCalledTimes(1)
	})

	it('still emits row-click when the host listens and declares no rowModal', () => {
		const onRowClick = jest.fn()
		const wrapper = mountIndex({ props: { onRowClick, selectable: false } })

		wrapper.vm.onRowClick(ROW)

		expect(onRowClick).toHaveBeenCalledWith(ROW)
		expect(wrapper.vm.showFormDialogVisible).toBe(false)
	})
})
