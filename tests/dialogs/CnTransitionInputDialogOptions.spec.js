/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An input that declares its choices is picked from them, not typed.
 */
import { mount } from '@vue/test-utils'
import CnTransitionInputDialog from '../../src/dialogs/CnTransitionInputDialog.vue'

const OPTIONS = [
	{ value: 'r-1', label: 'Granted' },
	{ value: 'r-2', label: 'Refused' },
]

const stubs = {
	NcSelect: {
		name: 'NcSelect',
		props: ['modelValue', 'options', 'label', 'inputLabel', 'clearable'],
		emits: ['update:modelValue'],
		template: '<div class="select" />',
	},
}

function mountDialog(inputs, schema = null) {
	return mount(CnTransitionInputDialog, {
		props: { transition: { action: 'close', label: 'Close', inputs }, schema },
		global: { stubs },
	})
}

describe('inputs that declare options', () => {
	it('renders a picker of the declared options, labelled by the input label', () => {
		const w = mountDialog([{ field: 'resultTypeId', required: true, label: 'Result', options: OPTIONS }])
		const select = w.findComponent({ name: 'NcSelect' })
		expect(select.exists()).toBe(true)
		expect(select.props('options')).toEqual(OPTIONS)
		expect(select.props('label')).toBe('label')
		expect(select.props('inputLabel')).toBe('Result *')
		expect(select.props('clearable')).toBe(false)
		expect(select.props('modelValue')).toBeNull()
		expect(w.findComponent({ name: 'NcTextField' }).exists()).toBe(false)
	})

	it('keeps confirm disabled until a choice is made, then sends its value', async () => {
		const w = mountDialog([{ field: 'resultTypeId', required: true, options: OPTIONS }])
		const confirm = () => w.get('[data-testid="cn-transition-input-confirm"]')
		expect(confirm().attributes('disabled')).toBeDefined()
		w.findComponent({ name: 'NcSelect' }).vm.$emit('update:modelValue', OPTIONS[1])
		await w.vm.$nextTick()
		expect(confirm().attributes('disabled')).toBeUndefined()
		expect(w.findComponent({ name: 'NcSelect' }).props('modelValue')).toEqual(OPTIONS[1])
		w.vm.onConfirm()
		expect(w.emitted('confirm')[0][0]).toEqual({ resultTypeId: 'r-2' })
	})

	it('empties the value when the choice is cleared', async () => {
		const w = mountDialog([{ field: 'resultTypeId', required: false, options: OPTIONS }])
		const select = () => w.findComponent({ name: 'NcSelect' })
		expect(select().props('clearable')).toBe(true)
		select().vm.$emit('update:modelValue', OPTIONS[0])
		await w.vm.$nextTick()
		select().vm.$emit('update:modelValue', null)
		await w.vm.$nextTick()
		w.vm.onConfirm()
		expect(w.emitted('confirm')[0][0]).toEqual({ resultTypeId: '' })
	})

	it('drops options without a value and labels the rest by their value when they have no label', () => {
		const w = mountDialog([{
			field: 'resultTypeId',
			options: [{ value: 'r-1' }, { value: '', label: 'Empty' }, { label: 'No value' }, 'not-an-option', { value: 7, label: ' Seven ' }],
		}])
		expect(w.findComponent({ name: 'NcSelect' }).props('options')).toEqual([
			{ value: 'r-1', label: 'r-1' },
			{ value: '7', label: 'Seven' },
		])
	})

	it('falls back to the schema-driven field when no option is usable', () => {
		const w = mountDialog([{ field: 'resultTypeId', required: true, options: [{ label: 'No value' }] }])
		expect(w.findComponent({ name: 'NcSelect' }).exists()).toBe(false)
		expect(w.findComponent({ name: 'NcTextField' }).attributes('label')).toBe('resultTypeId *')
	})

	it('names a field without options by its declared label over the schema title', () => {
		const w = mountDialog(
			[{ field: 'reason', required: true, label: 'Why' }],
			{ properties: { reason: { type: 'string', title: 'Reason' } } },
		)
		expect(w.findComponent({ name: 'NcTextField' }).attributes('label')).toBe('Why *')
	})
})
