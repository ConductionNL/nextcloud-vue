/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { resolveFilterValue, resolveFilterTokens } from '../../src/utils/resolveFilterTokens.js'

describe('resolveFilterTokens', () => {
	it('passes through non-token values', () => {
		expect(resolveFilterValue('won')).toBe('won')
		expect(resolveFilterValue(42)).toBe(42)
	})

	it('resolves @me to the current user id', () => {
		global.window = global.window || {}
		global.window.OC = { currentUser: 'admin' }
		expect(resolveFilterValue('@me')).toBe('admin')
	})

	it('resolves @today to a YYYY-MM-DD string', () => {
		expect(resolveFilterValue('@today')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
	})

	it('resolves a @today±Nd offset to a date N days away', () => {
		const today = new Date(); today.setHours(0, 0, 0, 0)
		const minus7 = new Date(today); minus7.setDate(minus7.getDate() - 7)
		const expected = `${minus7.getFullYear()}-${String(minus7.getMonth() + 1).padStart(2, '0')}-${String(minus7.getDate()).padStart(2, '0')}`
		expect(resolveFilterValue('@today-7d')).toBe(expected)
	})

	it('resolves tokens inside both equality and operator filter shapes', () => {
		global.window.OC = { currentUser: 'admin' }
		const out = resolveFilterTokens({ assignee: '@me', expectedCloseDate: { lt: '@today' } })
		expect(out.assignee).toBe('admin')
		expect(out.expectedCloseDate.lt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
	})
})
