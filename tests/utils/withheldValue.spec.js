/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/cell-config-growth/specs/cell-config-growth/spec.md#requirement-a-withheld-value-reads-as-withheld
 */
import { isWithheld, withheldReason } from '../../src/utils/withheldValue.js'

describe('withheldValue', () => {
	it('recognises only the marker object', () => {
		expect(isWithheld({ '@withheld': true })).toBe(true)
		expect(isWithheld({ '@withheld': 'true' })).toBe(false)
		expect(isWithheld([{ '@withheld': true }])).toBe(false)
		expect(isWithheld(null)).toBe(false)
		expect(isWithheld('withheld')).toBe(false)
	})

	it('reads the reason, or nothing', () => {
		expect(withheldReason({ '@withheld': true, reason: 'access' })).toBe('access')
		expect(withheldReason({ '@withheld': true })).toBe('')
		expect(withheldReason({ reason: 'access' })).toBe('')
	})
})
