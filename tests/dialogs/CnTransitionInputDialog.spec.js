/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnTransitionInputDialog — collects a lifecycle transition's
 * declared `inputs` before the transition is applied.
 *
 * Scope:
 *   - Field resolution from the object's schema (label from the property
 *     title, checkbox for boolean, textarea for long text, number for
 *     numeric) with a plain-text fallback for undeclared fields.
 *   - Required gating: confirm stays disabled until every `required: true`
 *     input is filled.
 *   - Confirm emits exactly the declared keys; cancel emits close only.
 */

import { mount } from '@vue/test-utils'
import CnTransitionInputDialog from '../../src/dialogs/CnTransitionInputDialog.vue'

const SCHEMA = {
	properties: {
		reason: { type: 'string', title: 'Reason for rejection' },
		notes: { type: 'string', title: 'Notes', maxLength: 4000 },
		amount: { type: 'number', title: 'Amount' },
		notify: { type: 'boolean', title: 'Notify the owner' },
	},
}

const makeTransition = (inputs, extra = {}) => ({
	action: 'reject',
	label: 'Reject request',
	inputs,
	...extra,
})

const mountDialog = (transition, schema = SCHEMA) => mount(CnTransitionInputDialog, {
	propsData: { transition, schema },
})

describe('CnTransitionInputDialog — field resolution', () => {
	it('resolves labels and widgets from the schema (text / textarea / number / checkbox)', () => {
		const wrapper = mountDialog(makeTransition([
			{ field: 'reason', required: true },
			{ field: 'notes', required: false },
			{ field: 'amount', required: false },
			{ field: 'notify', required: false },
		]))

		// Plain string → NcTextField, labelled from the property title (required → *).
		const reason = wrapper.find('[data-testid="cn-transition-input-reason"]')
		expect(reason.findComponent({ name: 'NcTextField' }).exists()).toBe(true)
		expect(reason.findComponent({ name: 'NcTextField' }).attributes('label')).toBe('Reason for rejection *')

		// maxLength > 255 → NcTextArea.
		const notes = wrapper.find('[data-testid="cn-transition-input-notes"]')
		expect(notes.findComponent({ name: 'NcTextArea' }).exists()).toBe(true)
		expect(notes.findComponent({ name: 'NcTextArea' }).attributes('label')).toBe('Notes')

		// number → NcTextField[type=number].
		const amount = wrapper.find('[data-testid="cn-transition-input-amount"]')
		expect(amount.findComponent({ name: 'NcTextField' }).attributes('type')).toBe('number')

		// boolean → NcCheckboxRadioSwitch with the label as its default slot.
		const notify = wrapper.find('[data-testid="cn-transition-input-notify"]')
		expect(notify.findComponent({ name: 'NcCheckboxRadioSwitch' }).exists()).toBe(true)
		expect(notify.text()).toContain('Notify the owner')
	})

	it('falls back to a plain labelled text input for a field the schema does not declare', () => {
		const wrapper = mountDialog(makeTransition([{ field: 'undeclared', required: false }]), null)
		const field = wrapper.find('[data-testid="cn-transition-input-undeclared"]')
		expect(field.findComponent({ name: 'NcTextField' }).exists()).toBe(true)
		expect(field.findComponent({ name: 'NcTextField' }).attributes('label')).toBe('undeclared')
	})

	it('uses the transition label as dialog title and confirm-button label', () => {
		const wrapper = mountDialog(makeTransition([{ field: 'reason', required: true }]))
		expect(wrapper.findComponent({ name: 'NcDialog' }).attributes('name')).toBe('Reject request')
		expect(wrapper.find('[data-testid="cn-transition-input-confirm"]').text()).toBe('Reject request')
	})
})

describe('CnTransitionInputDialog — required gating', () => {
	it('disables confirm until every required input is non-empty', async () => {
		const wrapper = mountDialog(makeTransition([
			{ field: 'reason', required: true },
			{ field: 'notes', required: false },
		]))
		const confirm = () => wrapper.find('[data-testid="cn-transition-input-confirm"]')
		expect(confirm().attributes('disabled')).toBeTruthy()

		const reason = wrapper.find('[data-testid="cn-transition-input-reason"]')
		reason.findComponent({ name: 'NcTextField' }).vm.$emit('update:model-value', 'Budget exceeded')
		await wrapper.vm.$nextTick()
		expect(confirm().attributes('disabled')).toBeFalsy()

		// Whitespace does not count as filled.
		reason.findComponent({ name: 'NcTextField' }).vm.$emit('update:model-value', '   ')
		await wrapper.vm.$nextTick()
		expect(confirm().attributes('disabled')).toBeTruthy()
	})

	it('treats a required boolean as filled only when checked', async () => {
		const wrapper = mountDialog(makeTransition([{ field: 'notify', required: true }]))
		const confirm = () => wrapper.find('[data-testid="cn-transition-input-confirm"]')
		expect(confirm().attributes('disabled')).toBeTruthy()

		wrapper.findComponent({ name: 'NcCheckboxRadioSwitch' }).vm.$emit('update:model-value', true)
		await wrapper.vm.$nextTick()
		expect(confirm().attributes('disabled')).toBeFalsy()
	})
})

describe('CnTransitionInputDialog — confirm / cancel', () => {
	it('confirm emits exactly the declared keys (numbers cast)', async () => {
		const wrapper = mountDialog(makeTransition([
			{ field: 'reason', required: true },
			{ field: 'amount', required: false },
			{ field: 'notify', required: false },
		]))
		wrapper.find('[data-testid="cn-transition-input-reason"]')
			.findComponent({ name: 'NcTextField' }).vm.$emit('update:model-value', 'Too expensive')
		wrapper.find('[data-testid="cn-transition-input-amount"]')
			.findComponent({ name: 'NcTextField' }).vm.$emit('update:model-value', '12.5')
		await wrapper.vm.$nextTick()

		await wrapper.find('[data-testid="cn-transition-input-confirm"]').trigger('click')
		const emitted = wrapper.emitted('confirm')
		expect(emitted).toBeTruthy()
		expect(emitted[0][0]).toEqual({ reason: 'Too expensive', amount: 12.5, notify: false })
		// Exactly the declared keys — nothing else sneaks into the payload.
		expect(Object.keys(emitted[0][0]).sort()).toEqual(['amount', 'notify', 'reason'])
	})

	it('confirm is a no-op while a required input is empty', async () => {
		const wrapper = mountDialog(makeTransition([{ field: 'reason', required: true }]))
		await wrapper.find('[data-testid="cn-transition-input-confirm"]').trigger('click')
		expect(wrapper.emitted('confirm')).toBeFalsy()
	})

	it('cancel emits close and never confirm', async () => {
		const wrapper = mountDialog(makeTransition([{ field: 'reason', required: true }]))
		await wrapper.find('[data-testid="cn-transition-input-cancel"]').trigger('click')
		expect(wrapper.emitted('close')).toBeTruthy()
		expect(wrapper.emitted('confirm')).toBeFalsy()
	})
})
