/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnTransitionInputFields draws an act's declared inputs in place: the
 * declared widget with its test id, a label drawn outside tied to its field,
 * two columns, a preview, a summary of what the act works on, a notice, and
 * a template that fills another input without writing over it.
 */

import { mount } from '@vue/test-utils'
import CnTransitionInputFields from '../../src/components/CnTransitionInputFields/CnTransitionInputFields.vue'
import { OTHER_OPTION_VALUE } from '../../src/utils/transitionInputs.js'

const stubs = {
	NcSelect: {
		name: 'NcSelect',
		props: ['modelValue', 'options', 'inputLabel', 'clearable', 'disabled'],
		emits: ['update:modelValue'],
		template: '<div class="select" />',
	},
	CnTemplateSelect: {
		name: 'CnTemplateSelect',
		props: ['url', 'params', 'inputLabel', 'mapOption', 'placeholder'],
		emits: ['apply'],
		template: '<div class="template" />',
	},
	NcNoteCard: { name: 'NcNoteCard', props: ['type', 'heading'], template: '<div class="note"><slot /></div>' },
}

const REASONS = [{ key: 'consent', name: 'Waiting for consent', legalBasis: 'Awb 4:5' }]

const SUSPEND = [
	{ field: 'pauseReason', optionsSource: 'pauseReasons', optionValue: 'key', optionLabel: 'name', required: true, label: 'Reason', testid: 'pause-picker', other: { label: 'Other', input: 'reason' } },
	{ field: 'reason', widget: 'text', required: true, label: 'Reason', labelOutside: true, id: 'act-reason', note: 'Goes into the history.', testid: 'reason-input' },
	{ field: 'days', widget: 'number', label: 'Days given', testid: 'days-input', helperFrom: { input: 'pauseReason', key: 'legalBasis' }, preview: { label: 'Comes back on', template: '{today+days|date}', note: 'Earlier if answered earlier.', testid: 'comes-back' } },
]

/**
 * Mount the fields.
 *
 * @param {object} props The props.
 * @return {object} The wrapper.
 */
function fields(props) {
	return mount(CnTransitionInputFields, { props: { markRequired: false, ...props }, global: { stubs } })
}

describe('CnTransitionInputFields', () => {
	it('draws the picker under its test id and hides the free text until Other', async () => {
		const w = fields({ inputs: SUSPEND, context: { pauseReasons: REASONS }, modelValue: { pauseReason: 'consent', days: '14' } })
		expect(w.findComponent({ name: 'NcSelect' }).attributes('data-testid')).toBe('pause-picker')
		expect(w.find('#act-reason').exists()).toBe(false)

		await w.setProps({ modelValue: { pauseReason: OTHER_OPTION_VALUE, days: '14' } })
		expect(w.find('#act-reason').exists()).toBe(true)
	})

	it('ties a label drawn outside to its field, and keeps the note', () => {
		const w = fields({ inputs: SUSPEND, context: { pauseReasons: [] }, modelValue: { days: '14' } })
		const label = w.find('label[for="act-reason"]')
		expect(label.exists()).toBe(true)
		expect(label.text()).toBe('Reason')
		expect(w.find('[data-testid="cn-transition-input-reason"]').text()).toContain('Goes into the history.')
	})

	it('shows the picked reason\'s ground as the days\' helper', () => {
		const w = fields({ inputs: SUSPEND, context: { pauseReasons: REASONS }, modelValue: { pauseReason: 'consent', days: '14' } })
		const days = w.findAllComponents({ name: 'NcTextField' }).find((c) => c.attributes('data-testid') === 'days-input')
		expect(days.attributes('helpertext')).toBe('Awb 4:5')
		expect(days.attributes('type')).toBe('number')
	})

	it('shows the preview once it can be worked out', async () => {
		const w = fields({ inputs: SUSPEND, context: { pauseReasons: [] }, modelValue: { days: '14' } })
		expect(w.find('[data-testid="comes-back-value"]').text()).not.toBe('')
		expect(w.find('[data-testid="comes-back"]').text()).toContain('Earlier if answered earlier.')
		await w.setProps({ modelValue: { days: '0' } })
		expect(w.find('[data-testid="comes-back"]').exists()).toBe(false)
	})

	it('sets the inputs side by side on two columns only', async () => {
		const w = fields({ inputs: SUSPEND, columns: 2 })
		expect(w.classes()).toContain('cn-transition-input-fields--columns')
		await w.setProps({ columns: 1 })
		expect(w.classes()).not.toContain('cn-transition-input-fields--columns')
	})

	it('draws a declared text area and a date', () => {
		const w = fields({ inputs: [
			{ field: 'reason', widget: 'textarea', label: 'Reason', testid: 'reason-input', rows: 2 },
			{ field: 'until', widget: 'date', label: 'Back on', testid: 'until-input' },
		] })
		expect(w.findComponent({ name: 'NcTextArea' }).attributes('data-testid')).toBe('reason-input')
		expect(w.findComponent({ name: 'NcTextField' }).attributes('type')).toBe('date')
	})

	it('keeps two changes made in one tick', async () => {
		const w = fields({ inputs: [{ field: 'a', widget: 'text' }, { field: 'b', widget: 'text' }], modelValue: {} })
		const [a, b] = w.findAllComponents({ name: 'NcTextField' })
		a.vm.$emit('update:modelValue', '1')
		b.vm.$emit('update:modelValue', '2')
		const emitted = w.emitted('update:modelValue')
		expect(emitted[emitted.length - 1][0]).toEqual({ a: '1', b: '2' })
	})

	it('fills the input a template names, never over typed text', async () => {
		const inputs = [
			{ field: 'template', widget: 'template', url: '/apps/x/api/templates', params: { kind: 'result' }, applyTo: 'reason', label: 'Template', testid: 'template-picker' },
			{ field: 'reason', widget: 'textarea', label: 'Reason' },
		]
		const w = fields({ inputs, modelValue: { reason: '' } })
		const picker = w.findComponent({ name: 'CnTemplateSelect' })
		expect(picker.props('url')).toBe('/apps/x/api/templates')
		expect(picker.props('params')).toEqual({ kind: 'result' })
		expect(picker.attributes('data-testid')).toBe('template-picker')

		picker.vm.$emit('apply', { id: 't', body: 'Granted.' })
		expect(w.emitted('update:modelValue')[0][0]).toEqual({ reason: 'Granted.' })

		const typed = fields({ inputs, modelValue: { reason: 'My own words.' } })
		typed.findComponent({ name: 'CnTemplateSelect' }).vm.$emit('apply', { id: 't', body: 'Granted.' })
		expect(typed.emitted('update:modelValue')).toBeUndefined()
	})

	it('shows a summary of what the act works on once it is read, and a notice', async () => {
		const summary = {
			when: 'record',
			testid: 'archive',
			card: { title: 'record.title', meta: ['record.identifier', 'record.owner'], badge: 'record.result' },
			title: 'Retention',
			facts: [
				{ label: 'Nomination', path: 'record.nomination', fallback: 'Not set' },
				{ label: 'Destruction date', path: 'record.destroyOn', fallback: 'Not set' },
			],
		}
		const notice = { type: 'info', heading: 'Read only afterwards', text: 'Nothing can be changed.' }
		const w = fields({ inputs: [], summary, notice, context: { record: null } })
		expect(w.find('[data-testid="archive-card"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-transition-input-fields-notice"]').text()).toContain('Nothing can be changed.')

		await w.setProps({ context: { record: { title: 'Case 1', identifier: 'Z-1', owner: 'Jan', result: 'Granted', nomination: 'keep' } } })
		expect(w.find('[data-testid="archive-card"]').text()).toContain('Z-1 · Jan')
		expect(w.find('[data-testid="archive-card"]').text()).toContain('Granted')
		const facts = w.find('[data-testid="archive-facts"]').findAll('dd').map((dd) => dd.text())
		expect(facts).toEqual(['keep', 'Not set'])
	})

	it('marks required labels unless told not to', () => {
		const inputs = [{ field: 'reason', widget: 'text', label: 'Reason', required: true }]
		const marked = mount(CnTransitionInputFields, { props: { inputs }, global: { stubs } })
		expect(marked.findComponent({ name: 'NcTextField' }).attributes('label')).toBe('Reason *')
		expect(fields({ inputs }).findComponent({ name: 'NcTextField' }).attributes('label')).toBe('Reason')
	})
})
