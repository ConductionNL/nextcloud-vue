/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * parties-accepted-kinds-by-shape: a party's schema kind is checked against
 * accepted role kinds through the identity shapes both name, not by comparing
 * "person" with "aanvrager".
 *
 * @spec openspec/changes/parties-accepted-kinds-by-shape/specs/object-parties/spec.md#requirement-a-party-is-checked-against-the-accepted-kinds-in-one-vocabulary
 */
import { partyKindAccepted } from '../../src/utils/objectParties.js'

const pipelinq = [
	{ code: 'aanvrager', identityShapes: ['naturalPerson', 'organization'] },
	{ code: 'contactpersoon', identityShapes: ['naturalPerson'] },
]
const own = [
	{ key: 'person', identityShapes: ['naturalPerson'] },
	{ key: 'organisation', identityShapes: ['organization'] },
	{ key: 'colleague', identityShapes: ['naturalPerson'] },
	{ key: 'address' },
]

describe('partyKindAccepted', () => {
	it('accepts a person, an organisation and a colleague by their shapes', () => {
		expect(partyKindAccepted('person', pipelinq, own)).toBe(true)
		expect(partyKindAccepted('organisation', pipelinq, own)).toBe(true)
		expect(partyKindAccepted('colleague', pipelinq, own)).toBe(true)
	})

	it('refuses a kind whose shapes none of the accepted kinds take', () => {
		expect(partyKindAccepted('organisation', [{ code: 'contactpersoon', identityShapes: ['naturalPerson'] }], own)).toBe(false)
	})

	it('cannot judge a kind that names no shapes, so it passes', () => {
		expect(partyKindAccepted('address', pipelinq, own)).toBe(true)
	})

	it('compares codes when the accepted kinds name no shapes', () => {
		expect(partyKindAccepted('person', [{ key: 'person' }], own)).toBe(true)
		expect(partyKindAccepted('organisation', [{ key: 'person' }], own)).toBe(false)
	})
})
