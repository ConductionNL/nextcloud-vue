/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { shallowMount } from '@vue/test-utils'
import CnObjectListWidgetForm from '../../src/components/CnObjectListWidgetForm/CnObjectListWidgetForm.vue'

jest.mock('../../src/utils/fetchSchemaProperties.js', () => ({
	fetchSchemaProperties: jest.fn(async () => ['title', 'expectedCloseDate', 'first_name']),
}))

describe('CnObjectListWidgetForm', () => {
	const mount = (content) => shallowMount(CnObjectListWidgetForm, {
		propsData: content ? { editingWidget: { content } } : {},
	})

	it('starts with a single blank column, not a bogus "title" property', () => {
		const w = mount()
		expect(w.vm.columns).toEqual([{ key: '', label: '' }])
	})

	it('preserves configured columns when editing', () => {
		const w = mount({ register: 'r', schema: 's', columns: [{ key: 'value', label: 'Amount' }] })
		expect(w.vm.columns).toEqual([{ key: 'value', label: 'Amount' }])
	})

	it('humanizes property keys into title-cased headers', () => {
		const w = mount()
		expect(w.vm.humanizeKey('expectedCloseDate')).toBe('Expected Close Date')
		expect(w.vm.humanizeKey('first_name')).toBe('First Name')
		expect(w.vm.humanizeKey('title')).toBe('Title')
		expect(w.vm.humanizeKey('')).toBe('')
	})

	it('auto-fills the header from the property when it is empty', () => {
		const w = mount()
		w.vm.updateColumn(0, 'key', 'expectedCloseDate')
		expect(w.vm.columns[0]).toEqual({ key: 'expectedCloseDate', label: 'Expected Close Date' })
	})

	it('re-derives the header when the header was still auto-derived', () => {
		const w = mount()
		w.vm.updateColumn(0, 'key', 'first_name')
		expect(w.vm.columns[0].label).toBe('First Name')
		w.vm.updateColumn(0, 'key', 'expectedCloseDate')
		expect(w.vm.columns[0].label).toBe('Expected Close Date')
	})

	it('preserves a manually edited header when the property changes', () => {
		const w = mount()
		w.vm.updateColumn(0, 'key', 'first_name')
		w.vm.updateColumn(0, 'label', 'Given name')
		w.vm.updateColumn(0, 'key', 'expectedCloseDate')
		expect(w.vm.columns[0].label).toBe('Given name')
	})

	it('drops empty columns from the assembled content', () => {
		const w = mount()
		// The default blank column must not be persisted.
		expect(w.vm.assembledContent.columns).toEqual([])
		w.vm.updateColumn(0, 'key', 'title')
		expect(w.vm.assembledContent.columns).toEqual([{ key: 'title', label: 'Title' }])
	})
})
