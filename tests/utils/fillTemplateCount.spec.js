/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `{list|count}` in a template: how many entries a list holds, and nothing for
 * an empty one, so "{occurrences|count} opened so far" is left out with it.
 *
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-line-can-be-chosen-by-condition
 */
import { fillTemplate } from '../../src/utils/fillTemplate.js'

describe('fillTemplate count', () => {
	it('counts a list and a number', () => {
		expect(fillTemplate('{occurrences|count} opened so far', { occurrences: [1, 2] })).toBe('2 opened so far')
		expect(fillTemplate('{n|count} left', { n: 3 })).toBe('3 left')
	})

	it('empties the template for an empty or absent list', () => {
		expect(fillTemplate('{occurrences|count} opened so far', { occurrences: [] })).toBe('')
		expect(fillTemplate('{occurrences|count} opened so far', {})).toBe('')
	})
})
