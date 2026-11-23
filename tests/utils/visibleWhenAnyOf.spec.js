/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The visibleWhen `anyOf` operator: a list value that shares an entry with
 * the listed values (DqSociaalDomein: the special-category notice shows when
 * the case's data categories hold health, ethnicity or another special one).
 *
 * @spec openspec/changes/record-list-footer-action/specs/record-list/spec.md#requirement-a-visiblewhen-condition-can-match-any-of-a-list
 */
import { compareVisibleWhen, evaluateVisibleWhen, evaluateVisibleWhenLocal } from '../../src/utils/visibleWhen.js'

const SPECIAL = ['health', 'ethnicity', 'religion']

describe('visibleWhen anyOf', () => {
	it('holds when a list value shares an entry with the listed values', () => {
		expect(compareVisibleWhen(['address', 'health'], 'anyOf', SPECIAL)).toBe(true)
		expect(compareVisibleWhen(['address', 'income'], 'anyOf', SPECIAL)).toBe(false)
	})

	it('reads a single value like in', () => {
		expect(compareVisibleWhen('religion', 'anyOf', SPECIAL)).toBe(true)
		expect(compareVisibleWhen('income', 'anyOf', SPECIAL)).toBe(false)
	})

	it('does not hold for an empty or missing value', () => {
		expect(compareVisibleWhen([], 'anyOf', SPECIAL)).toBe(false)
		expect(compareVisibleWhen(undefined, 'anyOf', SPECIAL)).toBe(false)
		expect(compareVisibleWhen(null, 'anyOf', [null])).toBe(false)
	})

	it('works in the local and the async evaluation', async () => {
		const cond = { field: 'dataCategories', op: 'anyOf', value: SPECIAL }
		expect(evaluateVisibleWhenLocal(cond, { dataCategories: ['health'] })).toBe(true)
		await expect(evaluateVisibleWhen(cond, { object: { dataCategories: ['income'] } })).resolves.toBe(false)
		await expect(evaluateVisibleWhen(cond, { object: { dataCategories: ['ethnicity', 'income'] } })).resolves.toBe(true)
	})
})
