/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The visibleWhen `contains` operator: a list value that holds the given
 * value. A case type's `overviewCards` list switches a generic overview card
 * on or off (`{ field: "caseType.overviewCards", op: "contains", value:
 * "tender-lots" }`).
 *
 * @spec openspec/changes/visible-when-contains/specs/visible-when/spec.md#requirement-a-condition-can-ask-whether-a-list-holds-a-value
 */
import { compareVisibleWhen, evaluateVisibleWhen, evaluateVisibleWhenLocal } from '../../src/utils/visibleWhen.js'

describe('visibleWhen contains', () => {
	it('holds when the list holds the value', () => {
		expect(compareVisibleWhen(['facts', 'tender-lots'], 'contains', 'tender-lots')).toBe(true)
		expect(compareVisibleWhen(['facts'], 'contains', 'tender-lots')).toBe(false)
	})

	it('compares loosely, so a number matches its string', () => {
		expect(compareVisibleWhen([1, 2], 'contains', '2')).toBe(true)
	})

	it('does not hold on a value that is not a list, or without a value', () => {
		expect(compareVisibleWhen('tender-lots', 'contains', 'tender-lots')).toBe(false)
		expect(compareVisibleWhen(undefined, 'contains', 'x')).toBe(false)
		expect(compareVisibleWhen([null], 'contains', null)).toBe(false)
	})

	it('resolves a token on the right-hand side', () => {
		expect(compareVisibleWhen(['u1', 'u2'], 'contains', '@object.owner', { object: { owner: 'u2' } })).toBe(true)
	})

	it('works in the local and the async evaluation', async () => {
		const cond = { field: 'caseType.overviewCards', op: 'contains', value: 'tender-lots' }
		expect(evaluateVisibleWhenLocal(cond, { caseType: { overviewCards: ['tender-lots'] } })).toBe(true)
		await expect(evaluateVisibleWhen(cond, { object: { caseType: { overviewCards: [] } } })).resolves.toBe(false)
	})
})
