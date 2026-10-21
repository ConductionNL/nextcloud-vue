/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnSubObjectsField grows three things pipelinq's booking editors needed:
 * cells edited in the row (`inline`), a summary line that adds the rows up,
 * and row rules whose message names the row that breaks them.
 *
 * @spec openspec/changes/sub-objects-inline-and-summary/specs/sub-objects-field/spec.md#requirement-short-rows-are-edited-in-the-row
 */
import { mount } from '@vue/test-utils'
import CnSubObjectsField, { rowRuleProblems } from '../../src/components/CnSubObjectsField/CnSubObjectsField.vue'
import { compareVisibleWhen } from '../../src/utils/visibleWhen.js'

const hours = {
	type: 'object',
	required: ['day'],
	properties: {
		day: { title: 'Day', enum: ['monday', 'tuesday'], 'x-enum-labels': { monday: 'Monday', tuesday: 'Tuesday' } },
		openTime: { title: 'Opens', type: 'string', format: 'time' },
		closeTime: { title: 'Closes', type: 'string', format: 'time' },
	},
}
const closeAfterOpen = [{
	when: { all: [{ field: 'openTime', op: 'notEmpty' }, { field: 'closeTime', op: 'notEmpty' }, { field: 'openTime', op: 'gte', value: '@row.closeTime' }] },
	message: 'Open time must be before close time.',
}]

/**
 * @param {object} props Extra props.
 * @return {object} The mounted field.
 */
function mountField(props) {
	return mount(CnSubObjectsField, {
		props: { items: hours, inputLabel: 'Working hours', itemLabel: 'Hours', ...props },
		global: { stubs: { CnFormDialog: true, NcActions: true, NcActionButton: true } },
	})
}

const last = (w) => w.emitted('update:modelValue').at(-1)[0]

describe('CnSubObjectsField inline', () => {
	it('gives each column the control its property asks for, named after the column and the row', () => {
		const w = mountField({ inline: true, modelValue: [{ day: 'monday', openTime: '09:00', closeTime: '17:00' }] })
		expect(w.vm.inlineColumns.map((c) => [c.key, c.kind])).toEqual([['day', 'select'], ['openTime', 'time'], ['closeTime', 'time']])
		expect(w.vm.inlineColumns[0].options).toEqual([{ value: 'monday', label: 'Monday' }, { value: 'tuesday', label: 'Tuesday' }])
		expect(w.find('[data-testid="cn-sub-objects-cell-openTime-0"]').exists()).toBe(true)
		expect(w.vm.cellLabel(w.vm.inlineColumns[1], 0)).toBe('Opens, Hours 1')
	})

	it('writes a cell and adds a row in place, without a dialog', () => {
		const w = mountField({ inline: true, modelValue: [{ day: 'monday', openTime: '09:00' }], newItem: { day: 'tuesday' } })
		w.vm.setCell(0, 'closeTime', '12:00')
		expect(last(w)).toEqual([{ day: 'monday', openTime: '09:00', closeTime: '12:00' }])
		w.vm.openAdd()
		expect(w.vm.editing).toBeNull()
		expect(last(w)).toEqual([{ day: 'monday', openTime: '09:00' }, { day: 'tuesday' }])
	})

	it('takes a format the schema leaves out from the row overrides', () => {
		const plain = { type: 'object', properties: { openTime: { title: 'Opens', type: 'string' } } }
		const w = mountField({ inline: true, items: plain, modelValue: [{}], fieldOverrides: { openTime: { format: 'time' } } })
		expect(w.vm.inlineColumns[0].kind).toBe('time')
	})

	it('names a column and its options after the row overrides', () => {
		const w = mountField({ inline: true, modelValue: [{}], fieldOverrides: { day: { label: 'Dag', enumLabels: { monday: 'Maandag' } } } })
		expect(w.vm.columns[0].label).toBe('Dag')
		expect(w.vm.inlineColumns[0].options[0]).toEqual({ value: 'monday', label: 'Maandag' })
	})

	it('keeps the row dialog without inline', () => {
		const w = mountField({ modelValue: [] })
		expect(w.vm.inlineColumns).toEqual([])
		w.vm.openAdd()
		expect(w.vm.editing).toEqual({ index: null, row: null })
	})
})

describe('CnSubObjectsField summary', () => {
	it('adds the rows up against a field of the object they belong to', () => {
		const steps = { type: 'object', properties: { name: { title: 'Step' }, durationMinutes: { title: 'Minutes', type: 'integer' } } }
		const w = mount(CnSubObjectsField, {
			props: { items: steps, modelValue: [{ name: 'a', durationMinutes: 20 }, { name: 'b', durationMinutes: 25 }], summary: '{sum:durationMinutes} of {@object.durationMinutes} min, {count} steps', parentData: { durationMinutes: 60 } },
			global: { stubs: { CnFormDialog: true, NcActions: true, NcActionButton: true } },
		})
		expect(w.find('[data-testid="cn-sub-objects-summary"]').text()).toBe('45 of 60 min, 2 steps')
	})

	it('shows no summary without rows', () => {
		expect(mountField({ modelValue: [], summary: '{count} rows' }).find('[data-testid="cn-sub-objects-summary"]').exists()).toBe(false)
	})
})

describe('CnSubObjectsField row rules', () => {
	it('names the first row that breaks a rule', () => {
		const w = mountField({ inline: true, rowRules: closeAfterOpen, modelValue: [{ day: 'monday', openTime: '09:00', closeTime: '17:00' }, { day: 'tuesday', openTime: '18:00', closeTime: '12:00' }] })
		expect(w.find('[data-testid="cn-sub-objects-error"]').text()).toBe('Hours 2: Open time must be before close time.')
	})

	it('reports nothing for rows that keep the rules, or leave the times empty', () => {
		expect(rowRuleProblems([{ openTime: '09:00', closeTime: '17:00' }, { openTime: '', closeTime: '' }], closeAfterOpen)).toEqual([])
		expect(rowRuleProblems([{ openTime: '10:00', closeTime: '09:30' }], closeAfterOpen)).toEqual([{ index: 0, message: 'Open time must be before close time.' }])
	})

	it('compares clock times as times of the day', () => {
		expect(compareVisibleWhen('09:00', 'lt', '17:30')).toBe(true)
		expect(compareVisibleWhen('18:00:00', 'gte', '17:30')).toBe(true)
		expect(compareVisibleWhen('9:00', 'lt', '17:30')).toBe(false)
	})
})
