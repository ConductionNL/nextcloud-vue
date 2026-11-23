/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/view-presentation-picker/tasks.md#task-2
 */
import { mount } from '@vue/test-utils'
import CnViewPresentationPicker from '../../src/components/CnViewPresentationPicker/CnViewPresentationPicker.vue'

const SCHEMA = {
	properties: {
		status: { type: 'string', title: 'Status', enum: ['new', 'open', 'done'] },
		title: { type: 'string', title: 'Title' },
		a: { type: 'string', title: 'A' },
		b: { type: 'string', title: 'B' },
		c: { type: 'string', title: 'C' },
		due: { type: 'string', title: 'Due', format: 'date' },
	},
}
const NO_DATES = { properties: { status: { type: 'string', enum: ['x'] } } }

const stubs = {
	NcSelect: { props: ['inputLabel', 'modelValue', 'options'], template: '<div class="sel" :data-label="inputLabel" />' },
	NcCheckboxRadioSwitch: { props: ['modelValue', 'value', 'disabled'], emits: ['update:modelValue'], template: '<label class="radio" :data-disabled="disabled"><slot /></label>' },
	NcButton: { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot name="icon" /></button>' },
}
const mountIt = (props = {}) => mount(CnViewPresentationPicker, { props: { schema: SCHEMA, ...props }, global: { stubs } })
const last = (w) => w.emitted('input').at(-1)[0]

describe('CnViewPresentationPicker', () => {
	it('defaults to a table and shows no field pickers', () => {
		const w = mountIt()
		expect(w.vm.viewType).toBe('table')
		expect(w.find('[data-testid="cn-view-presentation-kanban"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-view-presentation-calendar"]').exists()).toBe(false)
	})

	it('picking Board emits a kanban with the first group candidate, in OpenRegister\'s shape only', () => {
		const w = mountIt()
		w.vm.pickType('kanban')
		expect(last(w)).toEqual({ viewType: 'kanban', kanban: { groupByField: 'status' } })
	})

	it('picking Calendar emits a calendar with the first date field', () => {
		const w = mountIt()
		w.vm.pickType('calendar')
		expect(last(w)).toEqual({ viewType: 'calendar', calendar: { dateField: 'due' } })
	})

	it('switching back to a table drops the board settings', () => {
		const w = mountIt({ value: { viewType: 'kanban', kanban: { groupByField: 'status', cardFields: ['title'] } } })
		w.vm.pickType('table')
		expect(last(w)).toEqual({ viewType: 'table' })
		expect(last(w)).not.toHaveProperty('kanban')
	})

	it('disables a type whose role has no candidate and says why', () => {
		const w = mountIt({ schema: NO_DATES })
		expect(w.get('[data-testid="cn-view-presentation-type-calendar"]').attributes('data-disabled')).toBeDefined()
		expect(w.get('[data-testid="cn-view-presentation-reason-calendar"]').text()).toBe('This schema has no date field')
		expect(w.find('[data-testid="cn-view-presentation-reason-kanban"]').exists()).toBe(false)
	})

	it('caps card fields at four and offers nothing further', () => {
		const w = mountIt({ value: { viewType: 'kanban', kanban: { groupByField: 'status', cardFields: ['title', 'a', 'b', 'c'] } } })
		expect(w.vm.cardChoices).toEqual([])
		w.vm.pickCards(['title', 'a', 'b', 'c', 'due'].map((key) => ({ key })))
		expect(last(w).kanban.cardFields).toEqual(['title', 'a', 'b', 'c'])
		w.vm.pickCards([])
		expect(last(w).kanban).not.toHaveProperty('cardFields')
	})

	it('reorders the columns of an enum group field and emits the full order', () => {
		const w = mountIt({ value: { viewType: 'kanban', kanban: { groupByField: 'status' } } })
		expect(w.vm.orderedColumns).toEqual(['new', 'open', 'done'])
		w.vm.moveColumn(2, -1)
		expect(last(w).kanban.columnOrder).toEqual(['new', 'done', 'open'])
	})

	it('keeps card fields but resets the column order when the group field changes', () => {
		const w = mountIt({ value: { viewType: 'kanban', kanban: { groupByField: 'status', cardFields: ['title'], columnOrder: ['done', 'open', 'new'] } } })
		w.vm.pickGroup({ key: 'title' })
		expect(last(w)).toEqual({ viewType: 'kanban', kanban: { groupByField: 'title', cardFields: ['title'] } })
	})

	it('hides the column order when the group field has no enum', () => {
		const w = mountIt({ schema: { properties: { phase: { type: 'string' } }, 'x-openregister-lifecycle': { field: 'phase' } }, value: { viewType: 'kanban', kanban: { groupByField: 'phase' } } })
		expect(w.vm.orderedColumns).toEqual([])
		expect(w.find('[data-testid="cn-view-presentation-order"]').exists()).toBe(false)
	})

	it('sets and clears the end date field', () => {
		const w = mountIt({ value: { viewType: 'calendar', calendar: { dateField: 'due' } } })
		w.vm.pickDate('endDateField', { key: 'due' })
		expect(last(w).calendar).toEqual({ dateField: 'due', endDateField: 'due' })
		w.vm.pickDate('endDateField', null)
		expect(last(w).calendar).toEqual({ dateField: 'due' })
	})

	it('gives every select an input label', () => {
		const w = mountIt({ value: { viewType: 'kanban', kanban: { groupByField: 'status' } } })
		w.findAll('.sel').forEach((s) => expect(s.attributes('data-label')).toBeTruthy())
	})

	it('shows a refusal under the picker it names', () => {
		const w = mountIt({ value: { viewType: 'calendar', calendar: { dateField: 'due' } }, errors: { 'calendar.dateField': 'calendar.dateField is not a property' } })
		expect(w.get('[data-testid="cn-view-presentation-error-calendar.dateField"]').text()).toContain('not a property')
	})
})
