/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/transition-input-reference-and-subfields/tasks.md#task-2
 */
import { mount } from '@vue/test-utils'
import CnTransitionInputDialog from '../../src/dialogs/CnTransitionInputDialog.vue'

const SCHEMA = {
	properties: {
		mergedInto: { type: 'string', format: 'uuid', title: 'Merge into', $ref: 'LearnerProfile' },
		reason: { type: 'string', title: 'Reason' },
	},
}
const PROFILE = { id: 'p-1', name: 'Self' }

const stubs = { CnResourceSelect: { name: 'CnResourceSelect', props: ['register', 'schema', 'filter', 'exclude', 'modelValue', 'allowCreate', 'labelField'], emits: ['update:modelValue'], template: '<div class="picker" />' } }

function mountDialog(input, extra = {}) {
	return mount(CnTransitionInputDialog, {
		props: { transition: { action: 'merge', label: 'Merge', inputs: [input] }, schema: SCHEMA, register: 'learniq', currentObject: PROFILE, ...extra },
		global: { stubs },
	})
}

describe('reference inputs', () => {
	it('renders a record picker over the referenced schema, with the picker hints applied', () => {
		const w = mountDialog({ field: 'mergedInto', required: true, picker: { filter: { lifecycle: 'active' }, excludeSelf: true } })
		const picker = w.findComponent({ name: 'CnResourceSelect' })
		expect(picker.exists()).toBe(true)
		expect(picker.props('schema')).toBe('learner-profile')
		expect(picker.props('register')).toBe('learniq')
		expect(picker.props('filter')).toEqual({ lifecycle: 'active' })
		expect(picker.props('exclude')).toEqual(['p-1'])
		expect(picker.props('allowCreate')).toBe(false)
		expect(w.findComponent({ name: 'NcTextField' }).exists()).toBe(false)
	})

	it('excludes nothing without excludeSelf', () => {
		const w = mountDialog({ field: 'mergedInto', required: true })
		expect(w.findComponent({ name: 'CnResourceSelect' }).props('exclude')).toEqual([])
	})

	it('keeps confirm disabled until a record is picked, then sends its uuid', async () => {
		const w = mountDialog({ field: 'mergedInto', required: true })
		const confirm = () => w.get('[data-testid="cn-transition-input-confirm"]')
		expect(confirm().attributes('disabled')).toBeDefined()
		w.findComponent({ name: 'CnResourceSelect' }).vm.$emit('update:modelValue', 'uuid-9')
		await w.vm.$nextTick()
		expect(confirm().attributes('disabled')).toBeUndefined()
		w.vm.onConfirm()
		expect(w.emitted('confirm')[0][0]).toEqual({ mergedInto: 'uuid-9' })
	})

	it('leaves a plain string input as a text field', () => {
		const w = mountDialog({ field: 'reason' })
		expect(w.findComponent({ name: 'CnResourceSelect' }).exists()).toBe(false)
		expect(w.findComponent({ name: 'NcTextField' }).exists()).toBe(true)
	})

	it('falls back to text when no register is known for the reference', () => {
		const w = mountDialog({ field: 'mergedInto' }, { register: '' })
		expect(w.findComponent({ name: 'CnResourceSelect' }).exists()).toBe(false)
	})
})
