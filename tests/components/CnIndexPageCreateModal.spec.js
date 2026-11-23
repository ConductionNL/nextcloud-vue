/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `createModal`: Add and `?action=create` open the named registry modal
 * instead of the built-in form dialog, and fall back to it without CnAppRoot.
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

function mountIndex({ props = {}, openModal = null, query = {} } = {}) {
	return mount(CnIndexPage, {
		props: {
			title: 'Clients',
			schema: { title: 'Client', properties: { name: { type: 'string' } } },
			objects: [],
			loading: false,
			...props,
		},
		global: {
			stubs,
			provide: openModal ? { cnOpenModal: openModal } : {},
			mocks: {
				$route: { params: {}, query },
				$router: { push: jest.fn(), replace: jest.fn(() => Promise.resolve()) },
			},
		},
	})
}

describe('CnIndexPage createModal', () => {
	it('opens the registry modal on Add instead of the form dialog', async () => {
		const openModal = jest.fn()
		const wrapper = mountIndex({ props: { createModal: 'ClientCreateDialog' }, openModal })

		await wrapper.find('[data-testid="cn-cta-primary"]').trigger('click')

		expect(openModal).toHaveBeenCalledWith('ClientCreateDialog')
		expect(wrapper.vm.showFormDialogVisible).toBe(false)
	})

	it('opens the registry modal for ?action=create', () => {
		const openModal = jest.fn()
		mountIndex({ props: { createModal: 'ClientCreateDialog' }, openModal, query: { action: 'create' } })

		expect(openModal).toHaveBeenCalledWith('ClientCreateDialog')
	})

	it('falls back to the form dialog when no CnAppRoot provides cnOpenModal', async () => {
		const wrapper = mountIndex({ props: { createModal: 'ClientCreateDialog' } })

		await wrapper.find('[data-testid="cn-cta-primary"]').trigger('click')

		expect(wrapper.vm.showFormDialogVisible).toBe(true)
	})

	it('keeps the form dialog when createModal is unset', async () => {
		const openModal = jest.fn()
		const wrapper = mountIndex({ openModal })

		await wrapper.find('[data-testid="cn-cta-primary"]').trigger('click')

		expect(openModal).not.toHaveBeenCalled()
		expect(wrapper.vm.showFormDialogVisible).toBe(true)
	})
})
