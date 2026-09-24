/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnObjectDataWidget's collapsed field set: collapsed it renders the
 * first `collapsedFields` fields, and "Show all N fields" renders the rest.
 */
import { shallowMount } from '@vue/test-utils'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'

const KEYS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const SCHEMA = { properties: Object.fromEntries(KEYS.map((k) => [k, { type: 'string' }])) }
const DATA = Object.fromEntries(KEYS.map((k, i) => [k, String(i)]))

function mountWidget(props = {}) {
	return shallowMount(CnObjectDataWidget, {
		propsData: { schema: SCHEMA, objectData: DATA, editable: false, ...props },
		stubs: {
			CnWidgetWrapper: { template: '<div><slot /></div>' },
			CnFormDialog: true,
			CnObjectMetadataModal: true,
		},
		mocks: { t: (_app, s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k]) : s) },
	})
}

const cellCount = (w) => w.findAll('.cn-object-data-widget__cell').length

describe('CnObjectDataWidget — collapsed field set', () => {
	it('shows the first 4 fields while collapsed by default', () => {
		const w = mountWidget({ columns: 2 })
		expect(cellCount(w)).toBe(4)
		expect(w.find('.cn-object-data-widget__toggle').text()).toBe('Show all 8 fields')
	})

	it('shows every field once expanded, and the first few again on collapse', async () => {
		const w = mountWidget({ columns: 2 })
		w.vm.toggleExpanded()
		await w.vm.$nextTick()
		expect(cellCount(w)).toBe(8)
		expect(w.find('.cn-object-data-widget__toggle').text()).toBe('Show less')

		w.vm.toggleExpanded()
		await w.vm.$nextTick()
		expect(cellCount(w)).toBe(4)
	})

	it('renders no toggle when every field fits the collapsed count', () => {
		const w = mountWidget({ collapsedFields: 8 })
		expect(cellCount(w)).toBe(8)
		expect(w.find('.cn-object-data-widget__toggle').exists()).toBe(false)
	})
})
