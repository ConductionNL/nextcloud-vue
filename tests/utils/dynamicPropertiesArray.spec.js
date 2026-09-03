// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Array-mode dynamic values: answers stored on the parent rather than as one
// child record each.
//
// The two shapes answer different questions. Child records are queryable per
// answer; an array reads in one request and, more importantly, saves in the
// SAME write as its parent. The child-record path cannot do that, because the
// rows need the parent's id, so it writes afterwards and can leave answers
// behind if that second write fails.

import { valueArrayFor, usesArrayValues, valueRecordsFor } from '../../src/utils/dynamicProperties.js'

const ARRAY_CONFIG = {
	map: { title: 'name' },
	values: { mode: 'array', arrayKey: 'properties', definitionRef: 'propertyDefinition', valueKey: 'value' },
}
const RECORD_CONFIG = {
	values: { schema: 'caseProperty', objectRef: 'case', definitionRef: 'propertyDefinition', valueKey: 'value' },
}
const DEFS = [{ id: 'def-1', name: 'plafond' }, { id: 'def-2', name: 'targetGroup' }]
const ANSWERS = [{ definitionId: 'def-1', value: 50000 }, { definitionId: 'def-2', value: 'Sport' }]

describe('array-mode dynamic values', () => {
	it('recognises the array shape only when both mode and key are set', () => {
		expect(usesArrayValues(ARRAY_CONFIG)).toBe(true)
		expect(usesArrayValues(RECORD_CONFIG)).toBe(false)
		expect(usesArrayValues({ values: { mode: 'array' } })).toBe(false)
		expect(usesArrayValues(null)).toBe(false)
	})

	it('carries the definition name alongside the value', () => {
		// The denormalisation is the point: a reader renders the answers
		// without resolving every definition first.
		expect(valueArrayFor(ANSWERS, ARRAY_CONFIG, DEFS)).toEqual([
			{ propertyDefinition: 'def-1', name: 'plafond', value: '50000' },
			{ propertyDefinition: 'def-2', name: 'targetGroup', value: 'Sport' },
		])
	})

	it('drops empty answers, exactly as the record shape does', () => {
		const answers = [{ definitionId: 'def-1', value: '' }, { definitionId: 'def-2', value: null }]
		expect(valueArrayFor(answers, ARRAY_CONFIG, DEFS)).toEqual([])
		expect(valueRecordsFor(answers, RECORD_CONFIG, 'obj-1')).toEqual([])
	})

	it('serialises a non-scalar answer rather than dropping it', () => {
		const out = valueArrayFor([{ definitionId: 'def-1', value: { a: 1 } }], ARRAY_CONFIG, DEFS)
		expect(out[0].value).toBe('{"a":1}')
	})

	it('returns nothing for a record-mode config, so the two cannot both fire', () => {
		// Both paths running would write the answers twice, once on the parent
		// and once as child rows.
		expect(valueArrayFor(ANSWERS, RECORD_CONFIG, DEFS)).toEqual([])
	})

	it('leaves the record shape untouched', () => {
		expect(valueRecordsFor(ANSWERS, RECORD_CONFIG, 'obj-1')).toEqual([
			{ case: 'obj-1', propertyDefinition: 'def-1', value: '50000' },
			{ case: 'obj-1', propertyDefinition: 'def-2', value: 'Sport' },
		])
	})

	it('tolerates a definition it cannot resolve', () => {
		const out = valueArrayFor([{ definitionId: 'ghost', value: 'x' }], ARRAY_CONFIG, DEFS)
		expect(out).toEqual([{ propertyDefinition: 'ghost', name: '', value: 'x' }])
	})
})
