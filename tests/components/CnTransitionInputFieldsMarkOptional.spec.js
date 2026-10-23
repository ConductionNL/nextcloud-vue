/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An act's form can mark the inputs it does NOT require instead of the ones
 * it does, as the boards do: DqVolgendeStap labels "Dagen die de aanvrager
 * krijgt (niet verplicht)" and leaves "Reden" bare. Opt-in with
 * `markOptional`; without it the labels stay as they were.
 */

import { mount } from '@vue/test-utils'
import CnTransitionInputFields from '../../src/components/CnTransitionInputFields/CnTransitionInputFields.vue'

const stubs = {
	NcTextField: { name: 'NcTextField', props: ['label', 'modelValue', 'type'], template: '<input :aria-label="label">' },
}

const INPUTS = [
	{ field: 'reason', widget: 'text', label: 'Reason', required: true, labelOutside: true, id: 'act-reason' },
	{ field: 'days', widget: 'number', label: 'Days given', required: false },
]

/**
 * The labels the fields carry.
 *
 * @param {object} props Extra props.
 * @return {object} The outside label text and the days field's label.
 */
function labels(props) {
	const w = mount(CnTransitionInputFields, { props: { inputs: INPUTS, markRequired: false, ...props }, global: { stubs } })
	return {
		reason: w.find('label[for="act-reason"]').text(),
		days: w.findAllComponents({ name: 'NcTextField' }).map((field) => field.props('label')).find((label) => label.startsWith('Days')),
	}
}

describe('CnTransitionInputFields markOptional', () => {
	it('marks the inputs that are not required, and only those', () => {
		expect(labels({ markOptional: true })).toEqual({ reason: 'Reason', days: 'Days given (optional)' })
	})

	it('leaves every label as it was without the prop', () => {
		expect(labels({})).toEqual({ reason: 'Reason', days: 'Days given' })
	})
})
