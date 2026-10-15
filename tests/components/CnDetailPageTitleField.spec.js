/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A detail page names the record by a field (`titleField`): shillinq's invoice
 * page read "Debiteurenfactuur" (the schema title OpenRegister puts in
 * `@self.name`) where the board names the invoice number.
 *
 * @spec openspec/changes/detail-title-field/specs/detail-page/spec.md#requirement-a-detail-page-can-name-the-record-by-a-field
 */
import { mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const invoice = { '@self': { name: 'Debiteurenfactuur' }, number: 'F-2026-0001', customer: { ref: 'K-12' }, empty: '' }

function mountPage(extra = {}) {
	return mount(CnDetailPage, {
		propsData: {
			title: 'Invoice',
			register: 'reg',
			schema: 'case',
			objectId: 'id-1',
			objectStore: {
				objects: { 'reg-case': { 'id-1': invoice } },
				schemas: {},
				objectTypeRegistry: {},
				registerObjectType: jest.fn(),
				fetchObject: jest.fn(async () => null),
				fetchSchema: jest.fn(async () => null),
			},
			...extra,
		},
	})
}

describe('CnDetailPage: titleField', () => {
	it('names the record by the field', () => {
		const w = mountPage({ titleField: 'number' })
		expect(w.vm.displayTitle).toBe('F-2026-0001')
		expect(w.find('.cn-detail-page__title').text()).toBe('F-2026-0001')
		expect(w.vm.typeEyebrow).toBe('Invoice')
	})

	it('shows the display name without it (control)', () => {
		expect(mountPage().find('.cn-detail-page__title').text()).toBe('Debiteurenfactuur')
	})

	it('reads a dotted path', () => {
		expect(mountPage({ titleField: 'customer.ref' }).vm.displayTitle).toBe('K-12')
	})

	it('falls back to the display name when the field is empty or missing', () => {
		expect(mountPage({ titleField: 'empty' }).vm.displayTitle).toBe('Debiteurenfactuur')
		expect(mountPage({ titleField: 'nope' }).vm.displayTitle).toBe('Debiteurenfactuur')
	})

	it('names the current breadcrumb by the field too', () => {
		const w = mountPage({ titleField: 'number', breadcrumb: { label: 'Invoices', route: 'Invoices' } })
		expect(w.vm.breadcrumbCrumbs[1].label).toBe('F-2026-0001')
	})
})
