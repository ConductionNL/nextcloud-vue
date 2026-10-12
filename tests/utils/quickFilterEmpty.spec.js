/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The `empty` / `notEmpty` shorthand of a quick filter.
 */
import { expandEmptyFilters, withPersonalLenses } from '../../src/utils/personalLenses.js'

describe('quick filter empty / notEmpty', () => {
	it('turns empty into an isnull filter and keeps the entry filter', () => {
		const out = expandEmptyFilters([{ label: 'Never', empty: 'lastLoginAt', filter: { status: 'active' } }])
		expect(out[0].filter).toEqual({ status: 'active', lastLoginAt: { isnull: true } })
		expect(out[0].label).toBe('Never')
	})

	it('turns notEmpty into isnull false and takes a list of fields', () => {
		const out = expandEmptyFilters([{ label: 'Has both', notEmpty: ['email', 'phone'] }])
		expect(out[0].filter).toEqual({ email: { isnull: false }, phone: { isnull: false } })
	})

	it('returns the same array when no entry uses it, and passes null through', () => {
		const tabs = [{ label: 'All', filter: {} }]
		expect(expandEmptyFilters(tabs)).toBe(tabs)
		expect(expandEmptyFilters(null)).toBeNull()
	})

	it('is applied by withPersonalLenses, so every consumer sees the expanded filter', () => {
		const out = withPersonalLenses([{ label: 'Never', empty: 'lastLoginAt' }], [])
		expect(out[0].filter).toEqual({ lastLoginAt: { isnull: true } })
	})
})
