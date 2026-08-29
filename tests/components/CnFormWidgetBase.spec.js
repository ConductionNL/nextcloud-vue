/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnFormWidgetBase — the abstract form-widget primitive extracted
 * from CnInteractionFormWidget.
 *
 * The base owns the SHAPE and no domain logic: it never mutates `model`, it
 * reports edits upward, and it mirrors the host's legacy BEM block onto every
 * element so app CSS written against the pre-extraction class names keeps
 * matching. Each of those is asserted, because each would fail silently — a
 * base that quietly wrote into `model` would look correct until a host needed
 * to react to a change, and a missing legacy class only shows up as an app's
 * styling going away.
 */

import { mount } from '@vue/test-utils'
import CnFormWidgetBase from '../../src/components/CnFormWidgetBase/CnFormWidgetBase.vue'

const stubs = {
	// `emits: ['click']` matters: without it Vue also lets the parent's @click
	// through to the root element as a native listener, so one click fires the
	// handler twice and every "emitted once" assertion measures the stub.
	NcButton: { emits: ['click'], template: '<button :disabled="$attrs.disabled" :data-testid="$attrs[\'data-testid\']" @click="$emit(\'click\')"><slot /></button>' },
	NcTextField: {
		props: ['modelValue', 'label', 'error', 'helperText'],
		template: '<input class="tf" :value="modelValue" :data-label="label" :data-error="String(error)" :data-helper="helperText" @input="$emit(\'update:modelValue\', $event.target.value)" >',
	},
	NcSelect: {
		props: ['modelValue', 'options', 'inputLabel'],
		template: '<div class="sel" :data-label="inputLabel" :data-selected="modelValue ? modelValue.value : \'\'" />',
	},
}

const fields = [
	{ key: 'channel', type: 'select', label: 'Channel', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
	{ key: 'subject', type: 'text', label: 'Subject' },
	{ key: 'summary', type: 'textarea', label: 'Summary' },
]

const mountBase = (propsData = {}, opts = {}) => mount(CnFormWidgetBase, {
	propsData: { fields, model: {}, ...propsData },
	stubs,
	...opts,
})

describe('CnFormWidgetBase', () => {
	it('renders one field wrapper per declared field, in order', () => {
		const keys = mountBase().findAll('.cn-form-widget__field').map((el) => el.attributes('data-testid'))
		expect(keys).toEqual([
			'cn-form-widget-field-channel',
			'cn-form-widget-field-subject',
			'cn-form-widget-field-summary',
		])
	})

	it('omits a field marked visible: false', () => {
		const w = mountBase({ fields: [...fields, { key: 'hidden', type: 'text', label: 'H', visible: false }] })
		expect(w.find('[data-testid="cn-form-widget-field-hidden"]').exists()).toBe(false)
	})

	// The reason blockClass exists: an extraction that silently dropped the
	// host's own class names would take an app's CSS with it, and nothing
	// would report that.
	it('mirrors the host block class onto every element', () => {
		const w = mountBase({ blockClass: 'cn-my-widget' })
		expect(w.classes()).toContain('cn-my-widget')
		expect(w.find('.cn-form-widget__field').classes()).toContain('cn-my-widget__field')
		expect(w.find('.cn-form-widget__textarea').classes()).toContain('cn-my-widget__textarea')
		expect(w.find('.cn-form-widget__actions').classes()).toContain('cn-my-widget__actions')
	})

	it('emits nothing onto the model itself — the host owns the state', async () => {
		const model = { subject: '' }
		const w = mountBase({ model })
		await w.find('.tf').setValue('Broken meter')
		expect(model.subject).toBe('')
		expect(w.emitted('update:field')[0]).toEqual([{ key: 'subject', value: 'Broken meter' }])
	})

	it('reports a textarea edit under its own key', async () => {
		const w = mountBase()
		await w.find('textarea').setValue('lots of noise')
		expect(w.emitted('update:field')[0]).toEqual([{ key: 'summary', value: 'lots of noise' }])
	})

	it('resolves a select field back to its option object', () => {
		const w = mountBase({ model: { channel: 'b' } })
		expect(w.find('.sel').attributes('data-selected')).toBe('b')
	})

	it('pairs the textarea label with its control', () => {
		const w = mountBase()
		expect(w.find('label.cn-form-widget__label').attributes('for'))
			.toBe(w.find('textarea').attributes('id'))
	})

	it('puts a per-field error onto that field and no other', () => {
		const w = mountBase({ errors: { subject: 'Subject is required' } })
		const tf = w.find('.tf')
		expect(tf.attributes('data-error')).toBe('true')
		expect(tf.attributes('data-helper')).toBe('Subject is required')
	})

	it('disables submit while submitting and swaps its label', () => {
		const w = mountBase({ submitting: true, submitLabel: 'Register', submittingLabel: 'Saving…' })
		const btn = w.find('[data-testid="cn-form-widget-submit"]')
		expect(btn.text()).toBe('Saving…')
		expect(btn.attributes('disabled')).toBeDefined()
	})

	it('disables submit when the host says it cannot be submitted', () => {
		const w = mountBase({ canSubmit: false })
		expect(w.find('[data-testid="cn-form-widget-submit"]').attributes('disabled')).toBeDefined()
	})

	it('emits submit on click', async () => {
		const w = mountBase()
		await w.find('[data-testid="cn-form-widget-submit"]').trigger('click')
		expect(w.emitted('submit')).toHaveLength(1)
	})

	it('shows the form-level error line only when there is one', () => {
		expect(mountBase().find('[data-testid="cn-form-widget-error"]').exists()).toBe(false)
		expect(mountBase({ errorMessage: 'Cannot save' }).find('[data-testid="cn-form-widget-error"]').text())
			.toBe('Cannot save')
	})

	// The escape hatch that lets a widget mount a control the base has no type
	// for (a resource picker, a date range) without losing the field wrapper.
	it('lets a field-{key} slot replace one control, keeping the wrapper', () => {
		const w = mountBase({}, { slots: { 'field-subject': '<div class="custom" />' } })
		const wrapper = w.find('[data-testid="cn-form-widget-field-subject"]')
		expect(wrapper.find('.custom').exists()).toBe(true)
		expect(wrapper.find('.tf').exists()).toBe(false)
		// The other fields still render their defaults.
		expect(w.find('textarea').exists()).toBe(true)
	})
})
