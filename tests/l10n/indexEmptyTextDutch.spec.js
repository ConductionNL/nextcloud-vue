/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * An index page's empty state in Dutch. The shillinq lane read "No items
 * found" on a Dutch list: CnIndexPage defaulted `emptyText` to the bare
 * English key, which the table runs through the APP's catalogue, where the
 * library's string is absent. Runs the real @nextcloud/l10n, because a mock
 * that returns its input cannot tell a translated string from an untranslated
 * one.
 */

import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { registerTranslations } from '../../src/l10n/index.js'

const stubs = {
	CnDataTable: true,
	CnCardGrid: true,
	CnPagination: true,
	CnActionsBar: true,
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
	CnIcon: true,
	NcEmptyContent: { name: 'NcEmptyContent', props: ['name'], template: '<div class="empty-stub">{{ name }}</div>' },
}

const mountIndex = (propsData = {}) => mount(CnIndexPage, {
	propsData: { title: 'Items', objects: [], ...propsData },
	stubs,
	mocks: {
		$route: { params: {}, query: {}, name: 'items' },
		$router: { push: jest.fn(), replace: jest.fn() },
	},
})

describe('CnIndexPage empty state in Dutch', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('shows the library\'s Dutch empty text when the page names none', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()

		const wrapper = mountIndex()
		expect(wrapper.vm.emptyText).toBe('Geen items gevonden')
		expect(wrapper.find('.empty-stub').text()).toBe('Geen items gevonden')
	})

	it('keeps English for an English reader (control)', () => {
		expect(mountIndex().vm.emptyText).toBe('No items found')
	})

	it('keeps a page\'s own empty text', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()

		expect(mountIndex({ emptyText: 'No invoices yet' }).vm.emptyText).toBe('No invoices yet')
	})
})
