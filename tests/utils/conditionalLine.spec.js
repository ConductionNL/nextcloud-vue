/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-line-can-be-chosen-by-condition
 */
import { conditionalLine } from '../../src/utils/conditionalLine.js'

const LINES = [
	{ when: { field: 'computable', op: 'neq', value: true }, text: 'Progress cannot be computed.' },
	{ when: { field: 'mode', op: 'eq', value: 'manual' }, text: '{progress} percent done, entered by hand.' },
	{ text: '{progress} percent done.' },
]

describe('conditionalLine', () => {
	it('takes the first candidate whose condition holds', () => {
		expect(conditionalLine(LINES, { computable: false })).toBe('Progress cannot be computed.')
		expect(conditionalLine(LINES, { computable: true, mode: 'manual', progress: 40 })).toBe('40 percent done, entered by hand.')
		expect(conditionalLine(LINES, { computable: true, mode: 'fromTasks', progress: 0 })).toBe('0 percent done.')
	})

	it('skips a candidate whose template does not fill', () => {
		expect(conditionalLine(['{missing} here', 'Fallback'], {})).toBe('Fallback')
	})

	it('translates before it fills, and answers empty when nothing applies', () => {
		expect(conditionalLine(['Hi {name}'], { name: 'An' }, (text) => text.replace('Hi', 'Hoi'))).toBe('Hoi An')
		expect(conditionalLine([{ when: { field: 'a', op: 'eq', value: 1 }, text: 'x' }], { a: 2 })).toBe('')
	})
})
