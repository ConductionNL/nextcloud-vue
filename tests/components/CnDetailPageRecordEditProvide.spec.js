/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDetailPage hands its record edit form to the widgets below it
 * (`cnRecordEdit`), so a card's `edit-record` header button opens the same
 * form as the page's Edit, and only where the page may edit.
 *
 * @spec openspec/changes/widget-header-page-actions/specs/widget-header-page-actions/spec.md#requirement-a-widget-header-button-can-open-the-pages-edit-form-or-another-tab
 */
const { shallowMount } = require('@vue/test-utils')
const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default

const record = { id: 'ct-1', title: 'Omgevingsvergunning', '@self': { id: 'ct-1' } }

function mountDetail(propsData = {}) {
	const store = {
		schemas: { 'dossiq-caseType': { title: 'Case type', properties: { title: { type: 'string' } } } },
		objects: { 'dossiq-caseType': { 'ct-1': record } },
		saveObject: jest.fn(),
		getError: jest.fn().mockReturnValue(null),
	}
	return shallowMount(CnDetailPage, {
		propsData: { title: 'Case type', register: 'dossiq', schema: 'caseType', objectId: 'ct-1', objectStore: store, ...propsData },
		stubs: { CnFormDialog: { name: 'CnFormDialog', template: '<div />', methods: { setResult: jest.fn() } } },
	})
}

describe('CnDetailPage — cnRecordEdit', () => {
	it('is available and opens the edit form where the page may edit', () => {
		const wrapper = mountDetail({ showEditAction: true })
		const edit = wrapper.vm.$.provides.cnRecordEdit
		expect(edit.available).toBe(true)
		edit.open()
		expect(wrapper.vm.editFormOpen).toBe(true)
	})

	it('is not available where the page does not offer Edit', () => {
		expect(mountDetail().vm.$.provides.cnRecordEdit.available).toBe(false)
	})
})
