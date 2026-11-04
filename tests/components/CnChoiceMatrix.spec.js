/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnChoiceMatrix: rows against columns, every cell one choice from a closed set.
 *
 * @spec openspec/changes/choice-matrix/specs/choice-matrix/spec.md
 */
import { mount } from '@vue/test-utils'
import CnChoiceMatrix from '../../src/components/CnChoiceMatrix/CnChoiceMatrix.vue'

const CHOICES = [
	{ value: 'hidden', label: 'Hidden', tone: 'muted' },
	{ value: 'required', label: 'Required', tone: 'strong' },
	{ value: 'readonly', label: 'Read only' },
]

const ROWS = [{ id: 'costs', label: 'Building costs' }, { id: 'area', label: 'Area', readOnly: true }]
const COLUMNS = [{ key: 'intake', label: 'Intake', description: 'received' }, { key: 'lead', label: 'Team lead', readOnly: true }]

function mountMatrix(props = {}) {
	return mount(CnChoiceMatrix, {
		props: { rows: ROWS, columns: COLUMNS, choices: CHOICES, defaultValue: 'readonly', rowHeader: 'Field', ...props },
		global: {
			stubs: {
				NcSelect: {
					name: 'NcSelect',
					props: ['modelValue', 'options', 'ariaLabelCombobox'],
					emits: ['update:modelValue'],
					template: '<div class="select">{{ modelValue && modelValue.label }}</div>',
				},
			},
		},
	})
}

function cell(w, row, col) {
	return w.find(`[data-testid="cn-choice-matrix-cell-${row}-${col}"]`)
}

describe('CnChoiceMatrix', () => {
	it('draws row and column headers with scope, and the column description', () => {
		const w = mountMatrix()
		expect(w.find('th[scope="col"]').text()).toBe('Field')
		expect(w.find('[data-testid="cn-choice-matrix-col-intake"]').text()).toContain('received')
		expect(w.findAll('th[scope="row"]').map((th) => th.text())).toEqual(['Building costs', 'Area'])
	})

	it('shows the stored choice, and the default where nothing is stored', () => {
		const w = mountMatrix({ modelValue: { costs: { intake: 'required' } } })
		const selects = w.findAllComponents({ name: 'NcSelect' })
		expect(selects).toHaveLength(1)
		expect(selects[0].text()).toBe('Required')
		expect(cell(w, 'costs', 'lead').text()).toBe('Read only')
	})

	it('names each cell control by both axes', () => {
		const w = mountMatrix()
		expect(w.findComponent({ name: 'NcSelect' }).props('ariaLabelCombobox')).toContain('Building costs')
	})

	it('emits the whole new map and the changed cell, keeping the other cells', () => {
		const modelValue = { costs: { lead: 'hidden' }, area: { intake: 'required' } }
		const w = mountMatrix({ modelValue })
		w.findComponent({ name: 'NcSelect' }).vm.$emit('update:modelValue', CHOICES[1])
		expect(w.emitted('update:modelValue')[0][0]).toEqual({
			costs: { lead: 'hidden', intake: 'required' },
			area: { intake: 'required' },
		})
		expect(w.emitted('cell-change')[0][0]).toEqual({ rowId: 'costs', columnKey: 'intake', value: 'required', previous: 'readonly' })
		expect(modelValue.costs).toEqual({ lead: 'hidden' })
	})

	it('emits nothing when the same choice or no choice is picked', () => {
		const w = mountMatrix()
		const select = w.findComponent({ name: 'NcSelect' })
		select.vm.$emit('update:modelValue', CHOICES[2])
		select.vm.$emit('update:modelValue', null)
		expect(w.emitted('update:modelValue')).toBeUndefined()
	})

	it('draws text instead of controls for a read-only row, column or matrix', () => {
		const w = mountMatrix()
		expect(cell(w, 'area', 'intake').findComponent({ name: 'NcSelect' }).exists()).toBe(false)
		expect(cell(w, 'costs', 'lead').findComponent({ name: 'NcSelect' }).exists()).toBe(false)
		expect(mountMatrix({ readOnly: true }).findAllComponents({ name: 'NcSelect' })).toHaveLength(0)
	})

	it('marks a cell by its choice tone and shows a value outside the set as it is', () => {
		const w = mountMatrix({ readOnly: true, modelValue: { costs: { intake: 'hidden', lead: 'legacy' } } })
		const hidden = cell(w, 'costs', 'intake').find('[data-testid="cn-choice-matrix-value"]')
		expect(hidden.text()).toBe('Hidden')
		expect(hidden.classes()).toContain('cn-choice-matrix__value--muted')
		expect(cell(w, 'costs', 'lead').text()).toBe('legacy')
	})

	it('says so when there are no rows', () => {
		const w = mountMatrix({ rows: [] })
		expect(w.find('[data-testid="cn-choice-matrix-empty"]').text()).toBe('Nothing to set yet.')
		expect(w.find('table').exists()).toBe(false)
	})
})
