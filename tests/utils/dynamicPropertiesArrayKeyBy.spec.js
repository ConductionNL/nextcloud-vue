// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

import {
	answersByArrayKey,
	arrayKeysOf,
	DYNAMIC_KEY_PREFIX,
	storedAnswersFor,
} from '../../src/utils/dynamicProperties.js'

/**
 * A declaration that keeps flagged answers in a second array: an answer whose
 * definition carries `sensitive: true` goes to `sensitiveProperties`, which the
 * schema lets fewer people read.
 */
const CONFIG = {
	values: {
		mode: 'array',
		arrayKey: 'properties',
		definitionRef: 'propertyDefinition',
		nameKey: 'name',
		valueKey: 'value',
		arrayKeyBy: { field: 'sensitive', keys: { true: 'sensitiveProperties' } },
	},
}

const DEFINITIONS = [
	{ id: 'd-kind', name: 'requestKind' },
	{ id: 'd-income', name: 'incomeAssessment', sensitive: true },
	{ id: 'd-plain', name: 'districtTeam', sensitive: false },
]

describe('values.arrayKeyBy', () => {
	it('names every array the declaration stores answers in', () => {
		expect(arrayKeysOf(CONFIG)).toEqual(['properties', 'sensitiveProperties'])
		expect(arrayKeysOf({ values: { mode: 'array', arrayKey: 'properties' } })).toEqual(['properties'])
	})

	it('routes each answer to the array its definition flag names, the rest to arrayKey', () => {
		const answers = [
			{ definitionId: 'd-kind', value: 'general' },
			{ definitionId: 'd-income', value: { income: 480 } },
			{ definitionId: 'd-plain', value: 'oost' },
			{ definitionId: 'd-unknown', value: 'x' },
		]
		const groups = answersByArrayKey(answers, CONFIG, DEFINITIONS)
		expect(groups.properties.map((a) => a.definitionId)).toEqual(['d-kind', 'd-plain', 'd-unknown'])
		expect(groups.sensitiveProperties.map((a) => a.definitionId)).toEqual(['d-income'])
	})

	it('without arrayKeyBy, every answer goes to arrayKey', () => {
		const config = { values: { mode: 'array', arrayKey: 'properties' } }
		const groups = answersByArrayKey([{ definitionId: 'd-income', value: 1 }], config, DEFINITIONS)
		expect(Object.keys(groups)).toEqual(['properties'])
	})

	it('reads stored answers back from every array, so an edit shows both', () => {
		const record = {
			properties: [{ propertyDefinition: 'd-kind', name: 'requestKind', value: 'general' }],
			sensitiveProperties: [{ propertyDefinition: 'd-income', name: 'incomeAssessment', value: '{"income":480}' }],
		}
		const properties = {
			[`${DYNAMIC_KEY_PREFIX}d-kind`]: { type: 'string' },
			[`${DYNAMIC_KEY_PREFIX}d-income`]: { type: 'object' },
		}
		expect(storedAnswersFor(record, CONFIG, properties)).toEqual({
			[`${DYNAMIC_KEY_PREFIX}d-kind`]: 'general',
			[`${DYNAMIC_KEY_PREFIX}d-income`]: { income: 480 },
		})
	})

	it('reads nothing from an array the reader was not given', () => {
		// The server strips sensitiveProperties for a reader outside the group:
		// the form then simply has no stored answer to show for those fields.
		const record = { properties: [{ propertyDefinition: 'd-kind', name: 'requestKind', value: 'general' }] }
		const properties = { [`${DYNAMIC_KEY_PREFIX}d-income`]: { type: 'object' } }
		expect(storedAnswersFor(record, CONFIG, properties)).toEqual({})
	})
})
