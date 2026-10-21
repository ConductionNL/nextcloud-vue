/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDataMatrix grown for the `matrix` widget: keyboard-reachable cells, group
 * rows, a norm row, marked cells and a row actions column.
 *
 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnDataMatrix from '@/components/CnDataMatrix/CnDataMatrix.vue'

const columns = [
	{ key: 'w1', label: 'Week 1', type: 'number' },
	{ key: 'w2', label: 'Week 2', type: 'number', markBelow: 5.5, markLabel: 'Fail' },
	{ key: 'note', label: 'Note', type: 'string', readOnly: true },
]
const rows = [
	{ id: 'a', label: 'Anna', group: 'Class 1', w1: 30, w2: 5 },
	{ id: 'b', label: 'Bram', group: 'Class 1', w1: 14, w2: 7 },
	{ id: 'c', label: 'Cleo', group: 'Class 2', w1: 2, w2: 6 },
]

describe('CnDataMatrix keyboard, groups, norms and marks', () => {
	it('makes an editable cell focusable with a name that says its row and column', () => {
		const wrapper = mount(CnDataMatrix, { propsData: { rows, columns, rowHeader: 'Learner' } })
		const cell = wrapper.find('[data-row-id="a"][data-col-key="w1"] .cn-data-matrix__cell-value')
		expect(cell.attributes('tabindex')).toBe('0')
		expect(cell.attributes('role')).toBe('button')
		expect(cell.attributes('aria-label')).toContain('Anna')
		expect(cell.attributes('aria-label')).toContain('Week 1')
		const readOnly = wrapper.find('[data-row-id="a"][data-col-key="note"] .cn-data-matrix__cell-value')
		expect(readOnly.attributes('tabindex')).toBeUndefined()
		expect(readOnly.attributes('role')).toBeUndefined()
	})

	it('opens the editor on Enter and emits the typed text with the coerced value', async () => {
		const wrapper = mount(CnDataMatrix, { propsData: { rows, columns, rowHeader: 'Learner' } })
		await wrapper.find('[data-row-id="b"][data-col-key="w1"] .cn-data-matrix__cell-value').trigger('keydown', { key: 'Enter' })
		const input = wrapper.find('.cn-data-matrix__cell-input')
		expect(input.exists()).toBe(true)
		input.element.value = '6'
		await input.trigger('keydown.enter')
		expect(wrapper.emitted('cell-edit')[0][0]).toMatchObject({ rowId: 'b', colKey: 'w1', value: 6, raw: '6' })
	})

	it('opens the editor on F2 too', async () => {
		const wrapper = mount(CnDataMatrix, { propsData: { rows, columns } })
		await wrapper.find('[data-row-id="a"][data-col-key="w2"] .cn-data-matrix__cell-value').trigger('keydown', { key: 'F2' })
		expect(wrapper.find('.cn-data-matrix__cell-input').exists()).toBe(true)
	})

	it('draws a group row before each new group', () => {
		const wrapper = mount(CnDataMatrix, { propsData: { rows, columns, rowHeader: 'Learner', groupKey: 'group' } })
		const groups = wrapper.findAll('.cn-data-matrix__group-row')
		expect(groups).toHaveLength(2)
		expect(groups[0].text()).toBe('Class 1')
		expect(groups[1].text()).toBe('Class 2')
	})

	it('marks a value below markBelow and says why in text', () => {
		const wrapper = mount(CnDataMatrix, { propsData: { rows, columns } })
		const marked = wrapper.find('[data-row-id="a"][data-col-key="w2"]')
		expect(marked.classes()).toContain('cn-data-matrix__cell--marked')
		expect(marked.text()).toContain('Fail')
		expect(wrapper.find('[data-row-id="b"][data-col-key="w2"]').classes()).not.toContain('cn-data-matrix__cell--marked')
	})

	it('draws a norm row and marks a total above its norm', () => {
		const wrapper = mount(CnDataMatrix, {
			propsData: {
				rows,
				columns,
				rowHeader: 'Learner',
				showColumnTotals: true,
				normRow: { label: 'Norm', values: { w1: 40, w2: 20 } },
			},
		})
		const norm = wrapper.find('.cn-data-matrix__norm-row')
		expect(norm.text()).toContain('Norm')
		expect(norm.text()).toContain('40')
		const totals = wrapper.findAll('.cn-data-matrix__totals-row .cn-data-matrix__total-cell')
		expect(totals[0].classes()).toContain('cn-data-matrix__total-cell--over')
		expect(totals[0].text()).toContain('Above the norm')
		expect(totals[1].classes()).not.toContain('cn-data-matrix__total-cell--over')
	})

	it('adds a row actions column when the slot is used', () => {
		const wrapper = mount(CnDataMatrix, {
			propsData: { rows, columns, rowHeader: 'Learner', rowActionsHeader: 'Actions' },
			slots: { 'row-actions': ({ row }) => h('button', { class: 'act' }, `Go ${row.label}`) },
		})
		expect(wrapper.findAll('thead th')).toHaveLength(columns.length + 2)
		expect(wrapper.findAll('.act')).toHaveLength(3)
		expect(wrapper.find('.act').text()).toBe('Go Anna')
	})

	it('draws a text column as a multi-line editor', async () => {
		const wrapper = mount(CnDataMatrix, {
			propsData: { rows: [{ id: 'a', label: 'Anna', remark: 'ok' }], columns: [{ key: 'remark', label: 'Remark', type: 'text' }] },
		})
		await wrapper.find('.cn-data-matrix__cell-value').trigger('keydown', { key: 'Enter' })
		expect(wrapper.find('textarea.cn-data-matrix__cell-input').exists()).toBe(true)
	})
})
