/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A task form, inline.
 *
 * @spec openspec/changes/task-widget-on-the-record/specs/task-widget-on-the-record/spec.md#requirement-a-task-form-renders-inline
 */
import { mount } from '@vue/test-utils'
import CnTaskFormFields from '../../src/components/CnTaskFormFields/CnTaskFormFields.vue'

const FieldStub = {
	name: 'NcTextField',
	props: ['label', 'modelValue', 'disabled', 'helperText', 'required'],
	emits: ['update:modelValue'],
	template: '<label class="field" :data-label="label" :data-disabled="disabled" :data-required="required">{{ helperText }}<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></label>',
}

/**
 * @param {object} form The form.
 * @param {object} [extra] More props.
 * @return {import('@vue/test-utils').VueWrapper}
 */
function mountFields(form, extra = {}) {
	return mount(CnTaskFormFields, { props: { form, values: { verslag: 'Eerder' }, ...extra }, global: { stubs: { NcTextField: FieldStub, NcNoteCard: { template: '<div class="note"><slot /></div>' } } } })
}

const FIELDS = [
	{ field: 'besluit', required: false, order: 1, renderable: true },
	{ field: 'verslag', label: 'Verslag', required: true, order: 0, renderable: true },
	{ field: 'risico', required: true, order: 2, renderable: false, reason: 'The schema no longer has this field.' },
]

describe('CnTaskFormFields', () => {
	it('renders the declared fields in order, the answer so far, and an unavailable one disabled with its reason', () => {
		const fields = mountFields({ kind: 'fields', state: 'broken', fields: FIELDS }).findAll('.field')
		expect(fields.map((f) => f.attributes('data-label'))).toEqual(['Verslag', 'besluit', 'risico'])
		expect(fields[0].attributes('data-required')).toBe('true')
		expect(fields[0].find('input').element.value).toBe('Eerder')
		expect(fields[2].attributes('data-disabled')).toBe('true')
		expect(fields[2].text()).toBe('The schema no longer has this field. Ask the person who set up this step to fix it.')
	})

	it('emits each answer and writes nothing itself', async () => {
		const w = mountFields({ kind: 'fields', state: 'ready', fields: FIELDS.slice(0, 2) })
		await w.findAll('.field input')[1].setValue('ja')
		expect(w.emitted('answer')[0][0]).toEqual({ field: 'besluit', value: 'ja' })
	})

	it('shows the server sentence for a form it cannot render, and the external note', () => {
		expect(mountFields({ kind: 'fields', state: 'unresolvable', error: 'Flow X version 3 has no form.', fields: [] }).find('.note').text()).toBe('Flow X version 3 has no form.')
		expect(mountFields({ kind: 'external', state: 'ready' }).text()).toBe('This task is finished in its own form.')
	})

	it('draws only the unavailable rows for the dialog', () => {
		const fields = mountFields({ kind: 'fields', state: 'broken', fields: FIELDS }, { brokenOnly: true }).findAll('.field')
		expect(fields).toHaveLength(1)
		expect(fields[0].attributes('data-label')).toBe('risico')
	})
})
