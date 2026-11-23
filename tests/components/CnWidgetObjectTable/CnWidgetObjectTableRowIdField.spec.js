/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `rowIdField`: a row links to the record a field names instead of its own
 * id. DqTermijnen's payments table lists forfeited-fee rows that open their
 * case (`rowRoute: "CaseDetail"`, `rowIdField: "case"`).
 *
 * @spec openspec/changes/object-table-row-id-field/specs/object-table/spec.md#requirement-a-row-can-link-to-the-record-a-field-names
 */
import { shallowMount } from '@vue/test-utils'

jest.mock('../../../src/store/useObjectStore.js', () => ({
	useObjectStore: jest.fn(() => ({
		objects: {},
		loading: {},
		errors: {},
		pagination: {},
		registerObjectType: jest.fn(),
		fetchCollection: jest.fn(() => Promise.resolve([])),
	})),
}))

const CnWidgetObjectTable = require('../../../src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue').default
const CnObjectListWidget = require('../../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default

describe('object-table rowIdField', () => {
	it('links a row to the id the field names, dotted paths included', () => {
		const wrapper = shallowMount(CnWidgetObjectTable, { propsData: { rowRoute: 'CaseDetail', rowIdField: 'case' } })
		const fn = wrapper.findComponent({ name: 'CnDataTable' }).props('rowClickRoute')
		expect(fn({ id: 'pay-1', case: 'case-9' })).toEqual({ name: 'CaseDetail', params: { id: 'case-9' } })

		const nested = shallowMount(CnWidgetObjectTable, { propsData: { rowRoute: 'CaseDetail', rowIdField: 'case.id' } })
		const nestedFn = nested.findComponent({ name: 'CnDataTable' }).props('rowClickRoute')
		expect(nestedFn({ id: 'pay-1', case: { id: 'case-3' } })).toEqual({ name: 'CaseDetail', params: { id: 'case-3' } })
	})

	it('does not link a row whose field is empty', () => {
		const wrapper = shallowMount(CnWidgetObjectTable, { propsData: { rowRoute: 'CaseDetail', rowIdField: 'case' } })
		const fn = wrapper.findComponent({ name: 'CnDataTable' }).props('rowClickRoute')
		expect(fn({ id: 'pay-1' })).toBeNull()
	})

	it('keeps the row id without rowIdField', () => {
		const wrapper = shallowMount(CnWidgetObjectTable, { propsData: { rowRoute: 'CaseDetail' } })
		const fn = wrapper.findComponent({ name: 'CnDataTable' }).props('rowClickRoute')
		expect(fn({ id: 'pay-1', case: 'case-9' })).toEqual({ name: 'CaseDetail', params: { id: 'pay-1' } })
	})

	it('the object-list widget opens the record the field names too', () => {
		const push = jest.fn(() => Promise.resolve())
		const w = shallowMount(CnObjectListWidget, {
			propsData: { content: { register: 'r', schema: 's', rowRoute: 'CaseDetail', rowIdField: 'case', columns: [{ key: 'case', label: 'Zaak', widget: 'text' }] } },
			global: { mocks: { $router: { push, resolve: () => ({ href: '#' }) } }, stubs: { CnDataTable: true } },
		})
		w.vm.openRowRoute({ id: 'pay-1', case: 'case-9' })
		expect(push).toHaveBeenCalledWith({ name: 'CaseDetail', params: { id: 'case-9' } })
	})
})
