/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A transition input can name a sub-field by a dotted path
 * (`municipalityFeedback.masRoute`), required on its own, as learniq's
 * "Record municipality feedback" asks the MAS route and a note.
 *
 * @spec openspec/changes/transition-inputs-dotted-field/specs/transition-inputs/spec.md
 */
import { initialInputValues, normaliseInputs, readTransitionInputs, resolveInputFields } from '../../src/utils/transitionInputs.js'

const SCHEMA = {
	type: 'object',
	properties: {
		municipalityFeedback: {
			type: 'object',
			title: 'Municipality feedback',
			properties: {
				masRoute: { type: 'string', title: 'MAS route' },
				note: { type: 'string', title: 'Note' },
				receivedOn: { type: 'string', format: 'date', title: 'Received on' },
			},
		},
		reason: { type: 'string', title: 'Reason' },
	},
}
const INPUTS = [{ field: 'municipalityFeedback.masRoute', required: true }, { field: 'municipalityFeedback.note', label: 'Remark' }, { field: 'reason' }]

describe('dotted transition inputs', () => {
	it('folds the dotted inputs into one object input on the parent, in the place of the first', () => {
		const inputs = normaliseInputs(INPUTS)
		expect(inputs.map((i) => i.field)).toEqual(['municipalityFeedback', 'reason'])
		expect(inputs[0].fields).toEqual(['masRoute', 'note'])
		expect(inputs[0].requiredFields).toEqual(['masRoute'])
	})

	it('draws exactly the named sub-fields, the required one required and the labelled one by its label', () => {
		const [feedback] = resolveInputFields(INPUTS, { schema: SCHEMA })
		expect(feedback.widget).toBe('object')
		expect(feedback.subFields.map((sub) => [sub.key, sub.required, sub.label])).toEqual([
			['masRoute', true, 'MAS route'],
			['note', false, 'Remark'],
		])
	})

	it('is complete only once the required sub-field is filled, and sends the object', () => {
		const values = initialInputValues(INPUTS, SCHEMA, { municipalityFeedback: { receivedOn: '2026-11-01' } })
		expect(readTransitionInputs(INPUTS, values, { schema: SCHEMA }).complete).toBe(false)
		values.municipalityFeedback.masRoute = 'MAS-12'
		const { complete, data } = readTransitionInputs(INPUTS, values, { schema: SCHEMA })
		expect(complete).toBe(true)
		expect(data.municipalityFeedback).toEqual({ receivedOn: '2026-11-01', masRoute: 'MAS-12' })
	})

	it('leaves an input without a dot, or with a dot at either end, as it is', () => {
		expect(normaliseInputs([{ field: 'reason' }, { field: '.x' }, { field: 'y.' }]).map((i) => i.field)).toEqual(['reason', '.x', 'y.'])
	})
})
