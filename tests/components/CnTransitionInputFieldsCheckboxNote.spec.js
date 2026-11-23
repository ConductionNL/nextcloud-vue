/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A note under a switch (DqVolgendeStap "Herinner de verzoeker als het
 * antwoord uitblijft"), as a text field already carries one.
 *
 * @spec openspec/changes/transition-checkbox-note/specs/transition-checkbox-note/spec.md#requirement-a-switch-input-can-carry-a-note
 */
import { mount } from '@vue/test-utils'
import CnTransitionInputFields from '../../src/components/CnTransitionInputFields/CnTransitionInputFields.vue'

describe('CnTransitionInputFields checkbox note', () => {
	it('draws input.note under a switch, and nothing without one', () => {
		const inputs = [
			{ field: 'remindRequester', widget: 'checkbox', label: 'Remind the requester when no answer comes', note: 'After 14 days, at most twice.' },
			{ field: 'urgent', widget: 'checkbox', label: 'Urgent' },
		]
		const w = mount(CnTransitionInputFields, { props: { inputs, modelValue: {}, schema: { properties: { remindRequester: { type: 'boolean', title: 'Remind' }, urgent: { type: 'boolean', title: 'Urgent' } } } }, global: { stubs: { NcCheckboxRadioSwitch: { template: '<label><slot /></label>' } } } })
		expect(w.find('[data-testid="cn-transition-input-note-remindRequester"]').text()).toBe('After 14 days, at most twice.')
		expect(w.find('[data-testid="cn-transition-input-note-urgent"]').exists()).toBe(false)
	})
})
