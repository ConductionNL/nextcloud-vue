/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnChoiceMatrix `removableRows`, as board PqIntakeFormulier draws it: a row
 * whose question is gone carries an error and can be removed.
 *
 * @spec openspec/changes/choice-matrix-removable-rows/tasks.md#task-1
 */
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import CnChoiceMatrix from '../../src/components/CnChoiceMatrix/CnChoiceMatrix.vue'

const COLUMNS = [{ key: 'field', label: 'Field' }]
const CHOICES = [{ value: 'name', label: 'Name' }, { value: 'email', label: 'Email' }]
const ROWS = [
	{ id: 'q1', label: 'What is your name?' },
	{ id: 'q2', label: 'Old question' },
	{ id: 'q3', label: 'Your email?', removable: false },
]

/**
 * Mounts the matrix as a host would: a parent that drops a removed row and writes the map back.
 *
 * @param {object} [props] Extra props.
 * @return {object} The host wrapper.
 */
function mountHost(props = {}) {
	const Host = defineComponent({
		data: () => ({ rows: [...ROWS], value: { q1: { field: 'name' }, q2: { field: 'email' } } }),
		render() {
			return h(CnChoiceMatrix, {
				rows: this.rows,
				columns: COLUMNS,
				choices: CHOICES,
				modelValue: this.value,
				removableRows: true,
				rowErrors: { q2: 'This question is no longer on the form.' },
				'onUpdate:modelValue': (v) => { this.value = v },
				'onRemove-row': ({ rowId }) => { this.rows = this.rows.filter((r) => r.id !== rowId) },
				...props,
			})
		},
	})
	return mount(Host, { attachTo: document.body, global: { stubs: { NcSelect: true, NcButton: { template: '<button type="button"><slot /></button>' } } } })
}

describe('CnChoiceMatrix removableRows', () => {
	it('draws a named Remove button per row, except on a row that opts out', () => {
		const w = mountHost()
		expect(w.find('[data-testid="cn-choice-matrix-remove-q1"]').attributes('aria-label')).toBe('Remove What is your name?')
		expect(w.find('[data-testid="cn-choice-matrix-remove-q2"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-choice-matrix-remove-q3"]').exists()).toBe(false)
		w.unmount()
	})

	it('removes the row, drops its value, says so and keeps focus in the grid', async () => {
		const w = mountHost()
		const matrix = w.findComponent(CnChoiceMatrix)
		await w.find('[data-testid="cn-choice-matrix-remove-q2"]').trigger('click')
		expect(matrix.emitted('remove-row')[0][0].rowId).toBe('q2')
		expect(matrix.emitted('update:modelValue')[0][0]).toEqual({ q1: { field: 'name' } })
		await w.vm.$nextTick()
		await w.vm.$nextTick()
		expect(w.find('[data-testid="cn-choice-matrix-remove-q2"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-choice-matrix-status"]').text()).toBe('Removed Old question.')
		expect(document.activeElement).toBe(w.find('[data-testid="cn-choice-matrix-remove-q1"]').element)
		w.unmount()
	})

	it('also works with pickPerRow', () => {
		const rows = [{ id: 'r1', label: 'Opening', options: [{ key: 'a', label: 'A' }] }]
		const w = mountHost({ rows, pickPerRow: true })
		expect(w.find('[data-testid="cn-choice-matrix-remove-r1"]').exists()).toBe(true)
		w.unmount()
	})

	it('draws no Remove buttons and no actions column when read only or off', () => {
		for (const props of [{ readOnly: true }, { removableRows: false }]) {
			const w = mountHost(props)
			expect(w.find('[data-testid^="cn-choice-matrix-remove-"]').exists()).toBe(false)
			expect(w.find('th.cn-choice-matrix__actions').exists()).toBe(false)
			w.unmount()
		}
	})
})
