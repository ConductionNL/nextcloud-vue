/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Each row's menu button is named "Actions for <row>". A row whose `name` is
 * an object (a BRP person's name parts) used to fall back to a bare "Actions"
 * on every row (WCAG 2.4.6). The row's name now also comes from the record's
 * resolved display name, the title column's value, or the schema's title
 * property.
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

function mountIndex(props = {}) {
	return mount(CnIndexPage, {
		props: {
			title: 'Contacten',
			schema: { title: 'Person', properties: { displayName: { type: 'string' }, name: { type: 'object' } } },
			objects: [],
			loading: false,
			...props,
		},
		global: { stubs, mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn() } } },
	})
}

describe('CnIndexPage row name', () => {
	it('keeps a plain string title', () => {
		expect(mountIndex().vm.rowTitleFor({ id: '1', title: 'Zaak 12' })).toBe('Zaak 12')
	})

	it('uses the resolved display name when name is an object', () => {
		const row = { id: '1', name: { givenName: 'Henk' }, '@self': { name: 'Henk Bakker' } }
		expect(mountIndex().vm.rowTitleFor(row)).toBe('Henk Bakker')
	})

	it('uses the title column value', () => {
		const w = mountIndex({ columns: [{ key: 'displayName', label: 'Naam', widget: 'avatar' }, { key: 'bsn', label: 'BSN' }] })
		expect(w.vm.rowTitleFor({ id: '1', name: { givenName: 'Henk' }, displayName: 'Henk Bakker' })).toBe('Henk Bakker')
	})

	it('uses the schema title property', () => {
		const w = mountIndex({ schema: { title: 'Person', configuration: { objectNameField: 'fullName' }, properties: { fullName: { type: 'string' } } } })
		expect(w.vm.rowTitleFor({ id: '1', fullName: 'Linda Bakker' })).toBe('Linda Bakker')
	})

	it('answers empty when nothing names the row', () => {
		expect(mountIndex().vm.rowTitleFor({ id: '1', name: { givenName: 'Henk' } })).toBe('')
	})
})
