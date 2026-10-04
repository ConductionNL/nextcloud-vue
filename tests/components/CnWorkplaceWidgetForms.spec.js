/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The settings forms of the week-strip and stacked-bar widgets.
 *
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-stacked-bar-widget
 */

import { mount } from '@vue/test-utils'
import CnStackedBarWidgetForm from '../../src/components/CnStackedBarWidgetForm/CnStackedBarWidgetForm.vue'
import CnWeekStripWidgetForm from '../../src/components/CnWeekStripWidgetForm/CnWeekStripWidgetForm.vue'

jest.mock('../../src/utils/fetchSchemaProperties.js', () => ({
	fetchSchemaProperties: jest.fn().mockResolvedValue([]),
}))

const last = (wrapper) => {
	const emitted = wrapper.emitted('update:content')
	return emitted[emitted.length - 1][0]
}

describe('CnWeekStripWidgetForm', () => {
	it('assembles the content from its fields', () => {
		const wrapper = mount(CnWeekStripWidgetForm, { propsData: { value: {} } })
		wrapper.vm.updateSource('register', 'dossiq')
		wrapper.vm.updateSource('schema', 'case')
		wrapper.vm.updateField('dateField', 'deadline')
		wrapper.vm.updateField('metaFieldsText', ' identifier , caseType,, ')
		wrapper.vm.updateField('days', 7)
		expect(last(wrapper)).toMatchObject({
			source: { register: 'dossiq', schema: 'case', filter: {} },
			dateField: 'deadline',
			metaFields: ['identifier', 'caseType'],
			days: 7,
		})
	})

	it('pre-fills from the placement being edited and carries over what it does not edit', () => {
		const content = {
			source: { register: 'dossiq', schema: 'case', filter: { status: 'open' }, limit: 20 },
			dateField: 'deadline',
			metaFields: ['identifier'],
			days: 7,
			lateWhen: { op: 'lte', value: 0 },
			items: [],
		}
		// The @nextcloud/vue stub renders NcSelect's scoped slots without their
		// scope, which the filter editor's option slot cannot survive once it
		// has a row. The editor is not what this test is about.
		const wrapper = mount(CnWeekStripWidgetForm, {
			propsData: { editingWidget: { content } },
			global: { stubs: { CnFilterRowsEditor: true } },
		})
		expect(wrapper.vm.days).toBe(7)
		expect(wrapper.vm.metaFieldsText).toBe('identifier')
		wrapper.vm.updateField('emptyText', 'No deadlines')
		const out = last(wrapper)
		expect(out.lateWhen).toEqual({ op: 'lte', value: 0 })
		expect(out.source.limit).toBe(20)
		expect(out.source.filter).toEqual({ status: 'open' })
		expect(out.emptyText).toBe('No deadlines')
	})

	it('asks for a register, a schema and a date field', () => {
		const wrapper = mount(CnWeekStripWidgetForm, { propsData: { value: {} } })
		expect(wrapper.vm.validate()).toHaveLength(2)
		wrapper.vm.updateSource('register', 'dossiq')
		wrapper.vm.updateSource('schema', 'case')
		expect(wrapper.vm.validate()).toHaveLength(1)
		wrapper.vm.updateField('dateField', 'deadline')
		expect(wrapper.vm.validate()).toEqual([])
	})

	it('accepts a widget that only has static items', () => {
		const wrapper = mount(CnWeekStripWidgetForm, {
			propsData: { editingWidget: { content: { items: [{ title: 'A', date: '2026-10-05' }] } } },
		})
		expect(wrapper.vm.validate()).toEqual([])
	})
})

describe('CnStackedBarWidgetForm', () => {
	it('assembles the content from its fields', () => {
		const wrapper = mount(CnStackedBarWidgetForm, { propsData: { value: {} } })
		wrapper.vm.updateSource('register', 'dossiq')
		wrapper.vm.updateSource('schema', 'case')
		wrapper.vm.updateField('groupBy', 'status')
		wrapper.vm.updateField('orderText', 'received, in_progress ,decision')
		expect(last(wrapper)).toMatchObject({
			source: { register: 'dossiq', schema: 'case', groupBy: 'status', filter: {} },
			order: ['received', 'in_progress', 'decision'],
		})
	})

	it('carries over the labels map it does not edit', () => {
		const content = {
			source: { register: 'dossiq', schema: 'case', groupBy: 'status' },
			order: ['a'],
			labels: { a: 'Alpha' },
		}
		const wrapper = mount(CnStackedBarWidgetForm, { propsData: { editingWidget: { content } } })
		wrapper.vm.updateField('emptyText', 'Nothing')
		expect(last(wrapper).labels).toEqual({ a: 'Alpha' })
		expect(wrapper.vm.orderText).toBe('a')
	})

	it('asks for a register, a schema and a group field', () => {
		const wrapper = mount(CnStackedBarWidgetForm, { propsData: { value: {} } })
		expect(wrapper.vm.validate()).toHaveLength(2)
		wrapper.vm.updateSource('register', 'dossiq')
		wrapper.vm.updateSource('schema', 'case')
		wrapper.vm.updateField('groupBy', 'status')
		expect(wrapper.vm.validate()).toEqual([])
	})

	it('accepts a widget that only has static segments', () => {
		const wrapper = mount(CnStackedBarWidgetForm, {
			propsData: { editingWidget: { content: { segments: [{ label: 'A', value: 1 }] } } },
		})
		expect(wrapper.vm.validate()).toEqual([])
	})
})
