/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnObjectDataWidget's structured-value rendering (ADR-062):
 * arrays of objects become a compact inline table, arrays of scalars become
 * chips, and a single plain object becomes a key: value definition list —
 * never the useless "[object Object]".
 */
import { shallowMount } from '@vue/test-utils'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'

function mountWidget(schema, objectData) {
	return shallowMount(CnObjectDataWidget, {
		propsData: { schema, objectData, editable: false },
		stubs: {
			CnWidgetWrapper: { template: '<div><slot /></div>' },
			CnFormDialog: true,
			CnObjectMetadataModal: true,
		},
		mocks: { t: (_app, s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k]) : s) },
	})
}

describe('CnObjectDataWidget — structured value rendering', () => {
	it('renders an array of objects as an inline table, never "[object Object]"', () => {
		const schema = { properties: { rows: { type: 'array' } } }
		const w = mountWidget(schema, { rows: [{ name: 'A', qty: 2 }, { name: 'B', qty: 5 }] })
		expect(w.text()).not.toContain('[object Object]')
		const table = w.find('.cn-object-data-widget__mini-table')
		expect(table.exists()).toBe(true)
		expect(table.text()).toContain('name')
		expect(table.text()).toContain('qty')
		expect(table.text()).toContain('A')
		expect(table.text()).toContain('5')
	})

	it('caps the inline table at 5 columns and 5 rows with an "N more" affordance', () => {
		const schema = { properties: { rows: { type: 'array' } } }
		const wide = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7 }
		const rows = Array.from({ length: 8 }, (_, i) => ({ ...wide, a: i }))
		const w = mountWidget(schema, { rows })
		expect(w.vm.objectArrayColumns(rows).length).toBe(5)
		expect(w.vm.objectArrayRows(rows).length).toBe(5)
		expect(w.find('.cn-object-data-widget__more').text()).toContain('3 more')
	})

	it('renders an array of scalars as chips', () => {
		const schema = { properties: { tags: { type: 'array' } } }
		const w = mountWidget(schema, { tags: ['red', 'green', 'blue'] })
		const chips = w.findAll('.cn-object-data-widget__chip')
		expect(chips.length).toBe(3)
		expect(chips.at(1).text()).toBe('green')
	})

	it('renders a single plain object as a key: value definition list', () => {
		// A loosely-typed property (no explicit `type: 'object'`, which
		// fieldsFromSchema filters out) whose runtime value is a plain object.
		const schema = { properties: { meta: {} } }
		const w = mountWidget(schema, { meta: { author: 'Jo', pages: 12 } })
		expect(w.text()).not.toContain('[object Object]')
		const dl = w.find('.cn-object-data-widget__deflist')
		expect(dl.exists()).toBe(true)
		expect(dl.text()).toContain('author')
		expect(dl.text()).toContain('Jo')
		expect(dl.text()).toContain('pages')
		expect(dl.text()).toContain('12')
	})

	it('classifies value kinds correctly', () => {
		const schema = { properties: { a: {}, b: {}, c: {}, d: {} } }
		const w = mountWidget(schema, { a: [{ x: 1 }], b: [1, 2], c: { k: 1 }, d: 'plain' })
		expect(w.vm.fieldValueKind({ key: 'a' })).toBe('object-array')
		expect(w.vm.fieldValueKind({ key: 'b' })).toBe('scalar-array')
		expect(w.vm.fieldValueKind({ key: 'c' })).toBe('object')
		expect(w.vm.fieldValueKind({ key: 'd' })).toBe('scalar')
	})
})
