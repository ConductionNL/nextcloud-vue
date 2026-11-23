/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnChoiceMatrix heads sort and filter the rows, and read-only cells can be
 * pills (board DqZaaktypeVelden).
 *
 * @spec openspec/changes/choice-matrix-sort-filter-pills/specs/choice-matrix/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnChoiceMatrix from '../../src/components/CnChoiceMatrix/CnChoiceMatrix.vue'

const CHOICES = [
	{ value: 'required', label: 'Required', variant: 'info' },
	{ value: 'edit', label: 'Edit', variant: 'success' },
	{ value: 'readonly', label: 'Read only' },
	{ value: 'hidden', label: 'Hidden', variant: 'error' },
]

const ROWS = [
	{ id: 'type', label: 'Kind of building' },
	{ id: 'costs', label: 'Building costs' },
	{ id: 'area', label: 'Area' },
]

const COLUMNS = [{ key: 'intake', label: 'Intake' }, { key: 'lead', label: 'Team lead' }]

const VALUES = {
	type: { intake: 'hidden', lead: 'edit' },
	costs: { intake: 'required' },
	area: { intake: 'edit', lead: 'hidden' },
}

const stubs = {
	NcActions: { name: 'NcActions', template: '<div class="actions"><slot /></div>' },
	NcActionCheckbox: { name: 'NcActionCheckbox', props: ['modelValue'], emits: ['update:modelValue'], template: '<label class="filter-option"><slot /></label>' },
	NcActionInput: { name: 'NcActionInput', props: ['modelValue', 'label'], emits: ['update:modelValue'], template: '<input class="filter-text">' },
	CnStatusBadge: { name: 'CnStatusBadge', props: ['label', 'variant', 'size'], template: '<span class="pill" :data-variant="variant">{{ label }}</span>' },
}

function mountMatrix(props = {}) {
	return mount(CnChoiceMatrix, {
		props: { rows: ROWS, columns: COLUMNS, choices: CHOICES, defaultValue: 'readonly', rowHeader: 'Field', readOnly: true, modelValue: VALUES, ...props },
		global: { stubs },
	})
}

function rowLabels(w) {
	return w.findAll('[data-testid="cn-choice-matrix-grid-row"] th').map((th) => th.text())
}

describe('sortable heads', () => {
	it('draws no sort buttons and keeps the given order without the option', () => {
		const w = mountMatrix()
		expect(w.find('[data-testid="cn-choice-matrix-sort-row"]').exists()).toBe(false)
		expect(rowLabels(w)).toEqual(['Kind of building', 'Building costs', 'Area'])
	})

	it('sorts by label on the row head, ascending then descending', async () => {
		const w = mountMatrix({ sortable: true })
		await w.find('[data-testid="cn-choice-matrix-sort-row"]').trigger('click')
		expect(rowLabels(w)).toEqual(['Area', 'Building costs', 'Kind of building'])
		expect(w.find('th.cn-choice-matrix__corner').attributes('aria-sort')).toBe('ascending')
		await w.find('[data-testid="cn-choice-matrix-sort-row"]').trigger('click')
		expect(rowLabels(w)).toEqual(['Kind of building', 'Building costs', 'Area'])
		expect(w.find('th.cn-choice-matrix__corner').attributes('aria-sort')).toBe('descending')
	})

	it('sorts a column by the order of the choices, the default counting as a value', async () => {
		const w = mountMatrix({ sortable: true })
		await w.find('[data-testid="cn-choice-matrix-sort-lead"]').trigger('click')
		expect(rowLabels(w)).toEqual(['Kind of building', 'Building costs', 'Area'])
		await w.find('[data-testid="cn-choice-matrix-sort-intake"]').trigger('click')
		expect(rowLabels(w)).toEqual(['Building costs', 'Area', 'Kind of building'])
	})
})

describe('filterable heads', () => {
	it('offers each value a column holds, in the order of the choices', () => {
		const w = mountMatrix({ filterable: true })
		const options = w.find('[data-testid="cn-choice-matrix-filter-lead"]').findAll('.filter-option')
		expect(options.map((o) => o.text())).toEqual(['Edit', 'Read only', 'Hidden'])
	})

	it('keeps the rows whose cell holds a ticked value, and says when none is left', async () => {
		const w = mountMatrix({ filterable: true })
		w.find('[data-testid="cn-choice-matrix-filter-intake"]').findAllComponents({ name: 'NcActionCheckbox' })[0].vm.$emit('update:modelValue', true)
		await flushPromises()
		expect(rowLabels(w)).toEqual(['Building costs'])
		w.find('[data-testid="cn-choice-matrix-filter-lead"]').findAllComponents({ name: 'NcActionCheckbox' })[0].vm.$emit('update:modelValue', true)
		await flushPromises()
		expect(rowLabels(w)).toEqual([])
		expect(w.find('[data-testid="cn-choice-matrix-no-match"]').exists()).toBe(true)
	})

	it('filters the rows by the text typed in the row head', async () => {
		const w = mountMatrix({ filterable: true })
		w.findComponent({ name: 'NcActionInput' }).vm.$emit('update:modelValue', 'build')
		await flushPromises()
		expect(rowLabels(w)).toEqual(['Kind of building', 'Building costs'])
	})
})

describe('pill cells', () => {
	it('draws a read-only cell as a pill in its choice variant, default without one', () => {
		const w = mountMatrix({ pills: true })
		const pills = w.find('[data-testid="cn-choice-matrix-cell-costs-intake"]').find('.pill')
		expect(pills.text()).toBe('Required')
		expect(pills.attributes('data-variant')).toBe('info')
		expect(w.find('[data-testid="cn-choice-matrix-cell-costs-lead"] .pill').attributes('data-variant')).toBe('default')
	})

	it('keeps plain text without the option', () => {
		const w = mountMatrix()
		expect(w.find('.pill').exists()).toBe(false)
		expect(w.find('[data-testid="cn-choice-matrix-cell-costs-intake"]').text()).toBe('Required')
	})
})
