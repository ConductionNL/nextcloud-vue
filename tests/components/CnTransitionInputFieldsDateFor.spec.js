/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A days input with `dateField` draws an editable date under it, prefilled
 * from the days; choosing a date sets the days (DqVolgendeStap).
 *
 * @spec openspec/changes/days-input-as-date/specs/transition-inputs/spec.md
 */
import { mount } from '@vue/test-utils'
import CnTransitionInputFields from '../../src/components/CnTransitionInputFields/CnTransitionInputFields.vue'
import { dayAfterIso } from '../../src/utils/transitionInputs.js'

const INPUTS = [{ field: 'days', widget: 'number', label: 'Days given', testid: 'days-input', dateField: { label: 'Comes back on', note: 'Earlier if answered earlier.', testid: 'comes-back' } }]

function fields(props) {
	return mount(CnTransitionInputFields, { props: { markRequired: false, ...props } })
}

function dateInput(w) {
	return w.findAllComponents({ name: 'NcTextField' }).find((input) => input.attributes('type') === 'date')
}

describe('CnTransitionInputFields dateField', () => {
	it('draws the date field prefilled from the days, with its label and note', () => {
		const w = fields({ inputs: INPUTS, modelValue: { days: '14' } })
		const date = w.find('[data-testid="comes-back"]')
		expect(date.exists()).toBe(true)
		expect(date.text()).toContain('Comes back on')
		expect(date.text()).toContain('Earlier if answered earlier.')
		const input = dateInput(w)
		expect(input.attributes('modelvalue')).toBe(dayAfterIso('14', new Date()))
	})

	it('sets the days from a chosen date', async () => {
		const w = fields({ inputs: INPUTS, modelValue: { days: '14' } })
		dateInput(w).vm.$emit('update:modelValue', dayAfterIso('20', new Date()))
		const emitted = w.emitted('update:modelValue')
		expect(emitted.at(-1)[0].days).toBe('20')
	})

	it('draws no preview line beside it', () => {
		const w = fields({ inputs: INPUTS, modelValue: { days: '14' } })
		expect(w.find('.cn-transition-input-fields__preview').exists()).toBe(false)
	})
})
