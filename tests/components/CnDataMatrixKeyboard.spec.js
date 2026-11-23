/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { mount } from '@vue/test-utils'
import CnDataMatrix from '@/components/CnDataMatrix/CnDataMatrix.vue'

const columns = [
	{ key: 'q1', label: 'Q1', type: 'number' },
	{ key: 'note', label: 'Note', type: 'string', readOnly: true },
	{ key: 'double', label: 'Double', type: 'number', formula: 'q1*2' },
]
const rows = [
	{ id: 1, label: 'Alpha', q1: 10, note: 'ok' },
	{ id: 2, label: 'Bravo', q1: null, note: '' },
]

/**
 * The value span of a cell.
 *
 * @param {object} wrapper Mounted matrix.
 * @param {number} rowId Row id.
 * @param {string} colKey Column key.
 * @return {object} The span wrapper.
 */
function cell(wrapper, rowId, colKey) {
	return wrapper.find(`td[data-row-id="${rowId}"][data-col-key="${colKey}"] .cn-data-matrix__cell-value`)
}

/**
 * The edit input of a cell.
 *
 * @param {object} wrapper Mounted matrix.
 * @param {number} rowId Row id.
 * @param {string} colKey Column key.
 * @return {object} The input wrapper.
 */
function input(wrapper, rowId, colKey) {
	return wrapper.find(`td[data-row-id="${rowId}"][data-col-key="${colKey}"] input`)
}

describe('CnDataMatrix keyboard editing', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
	})

	/**
	 * Mount attached to the document so focus can be asserted.
	 *
	 * @param {object} props Extra props.
	 * @return {object} The wrapper.
	 */
	function mountMatrix(props = {}) {
		wrapper = mount(CnDataMatrix, { propsData: { rows, columns, ...props }, attachTo: document.body })
		return wrapper
	}

	it('puts every editable cell in the tab order with a role and a name', () => {
		mountMatrix()
		const span = cell(wrapper, 1, 'q1')
		expect(span.attributes('tabindex')).toBe('0')
		expect(span.attributes('role')).toBe('button')
		expect(span.attributes('aria-label')).toBe('Q1, Alpha: 10')
		expect(cell(wrapper, 2, 'q1').attributes('aria-label')).toBe('Q1, Bravo: empty')
	})

	it('leaves read-only and formula cells out of the tab order', () => {
		mountMatrix()
		for (const key of ['note', 'double']) {
			const span = cell(wrapper, 1, key)
			expect(span.attributes('tabindex')).toBeUndefined()
			expect(span.attributes('role')).toBeUndefined()
			expect(span.attributes('aria-label')).toBeUndefined()
		}
	})

	it('leaves a read-only matrix out of the tab order', () => {
		mountMatrix({ readOnly: true })
		expect(wrapper.findAll('[tabindex]').length).toBe(0)
		expect(wrapper.findAll('[role="button"]').length).toBe(0)
	})

	it.each(['Enter', 'F2'])('opens the cell for editing on %s and focuses a labelled input', async (key) => {
		mountMatrix()
		await cell(wrapper, 1, 'q1').trigger('keydown', { key })
		await wrapper.vm.$nextTick()
		const field = input(wrapper, 1, 'q1')
		expect(field.exists()).toBe(true)
		expect(document.activeElement).toBe(field.element)
		expect(field.attributes('aria-label')).toBe('Q1, Alpha')
	})

	it('ignores other keys on a cell', async () => {
		mountMatrix()
		await cell(wrapper, 1, 'q1').trigger('keydown', { key: 'a' })
		expect(input(wrapper, 1, 'q1').exists()).toBe(false)
	})

	it('does not open a read-only cell on Enter', async () => {
		mountMatrix()
		await cell(wrapper, 1, 'note').trigger('keydown', { key: 'Enter' })
		expect(input(wrapper, 1, 'note').exists()).toBe(false)
	})

	it('commits on Enter, emits once and returns focus to the cell', async () => {
		mountMatrix()
		await cell(wrapper, 1, 'q1').trigger('keydown', { key: 'Enter' })
		await wrapper.vm.$nextTick()
		const field = input(wrapper, 1, 'q1')
		field.element.value = '42'
		await field.trigger('keydown', { key: 'Enter' })
		await wrapper.vm.$nextTick()
		expect(wrapper.emitted('cell-edit')).toHaveLength(1)
		expect(wrapper.emitted('cell-edit')[0][0]).toMatchObject({ rowId: 1, colKey: 'q1', value: 42 })
		expect(input(wrapper, 1, 'q1').exists()).toBe(false)
		expect(document.activeElement).toBe(cell(wrapper, 1, 'q1').element)
	})

	it('cancels on Escape without emitting and returns focus to the cell', async () => {
		mountMatrix()
		await cell(wrapper, 1, 'q1').trigger('keydown', { key: 'F2' })
		await wrapper.vm.$nextTick()
		const field = input(wrapper, 1, 'q1')
		field.element.value = '99'
		await field.trigger('keydown', { key: 'Escape' })
		await wrapper.vm.$nextTick()
		expect(wrapper.emitted('cell-edit')).toBeUndefined()
		expect(input(wrapper, 1, 'q1').exists()).toBe(false)
		expect(document.activeElement).toBe(cell(wrapper, 1, 'q1').element)
	})
})
