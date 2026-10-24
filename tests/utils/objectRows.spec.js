import { resolveTabCount } from '../../src/utils/detailActionModel.js'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/record-list-object-rows/specs/record-list/spec.md
 */
import { objectRowsOf } from '../../src/utils/objectRows.js'

const SPEC = { path: 'sensitiveProperties', where: { name: 'onderzoeksstappen' }, valuePath: 'value' }
const CASE = {
	sensitiveProperties: [
		{ name: 'hulpvraag', value: 'Slaapproblemen' },
		{ name: 'onderzoeksstappen', value: JSON.stringify([{ kind: 'gesprek' }, { kind: 'informatie-opgevraagd' }]) },
	],
}

describe('objectRowsOf', () => {
	it('reads the matching entry\'s rows, decoding a JSON string', () => {
		expect(objectRowsOf(CASE, SPEC).map((row) => row.kind)).toEqual(['gesprek', 'informatie-opgevraagd'])
	})

	it('reads a plain list at path, and an array value as is', () => {
		expect(objectRowsOf({ steps: [{ a: 1 }, 'x', [2]] }, { path: 'steps' })).toEqual([{ a: 1 }])
		expect(objectRowsOf({ answers: [{ name: 'n', value: [{ b: 2 }] }] }, { path: 'answers', where: { name: 'n' }, valuePath: 'value' })).toEqual([{ b: 2 }])
	})

	it('is no rows for a record without them, broken JSON or no record', () => {
		expect(objectRowsOf({ title: 'x' }, SPEC)).toEqual([])
		expect(objectRowsOf({ sensitiveProperties: [{ name: 'onderzoeksstappen', value: '[oops' }] }, SPEC)).toEqual([])
		expect(objectRowsOf(null, SPEC)).toEqual([])
	})
})

describe('resolveTabCount countObjectRows', () => {
	it('counts the rows the record holds', () => {
		expect(resolveTabCount({ label: 'Investigation', countObjectRows: SPEC }, CASE)).toBe(2)
		expect(resolveTabCount({ label: 'Investigation', countObjectRows: SPEC }, { title: 'x' })).toBe(0)
	})
})
