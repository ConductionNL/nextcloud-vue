/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { resolveFilterValue, resolveFilterTokens, hasUnresolvedTokens, isOptionalUnresolved, dropOptionalUnresolved } from '../../src/utils/resolveFilterTokens.js'

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

	describe('object-context tokens', () => {
		it('resolves @objectId from ctx, passes through without ctx', () => {
			expect(resolveFilterValue('@objectId', { objectId: 'abc-123' })).toBe('abc-123')
			expect(resolveFilterValue('@objectId')).toBe('@objectId')
			expect(resolveFilterValue('@objectId', {})).toBe('@objectId')
		})

		it('resolves @object.<field> from ctx.object', () => {
			const ctx = { object: { client: 'Acme', stage: 'won' } }
			expect(resolveFilterValue('@object.client', ctx)).toBe('Acme')
			expect(resolveFilterValue('@object.missing', ctx)).toBe('@object.missing')
			expect(resolveFilterValue('@object.client')).toBe('@object.client')
		})

		it('threads ctx through resolveFilterTokens into a filter map', () => {
			const out = resolveFilterTokens({ lead: '@objectId', client: '@object.client' }, { objectId: 42, object: { client: 'Acme' } })
			expect(out.lead).toBe('42')
			expect(out.client).toBe('Acme')
		})
	})

	describe('workspace-context tokens', () => {
		it('resolves @workspace.<key> from ctx.workspace', () => {
			const ctx = { workspace: { selectedClient: 'c-1', activeSummary: 'broken router' } }
			expect(resolveFilterValue('@workspace.selectedClient', ctx)).toBe('c-1')
			expect(resolveFilterValue('@workspace.activeSummary', ctx)).toBe('broken router')
		})

		it('passes through an unresolved @workspace token (no value / no ctx)', () => {
			expect(resolveFilterValue('@workspace.selectedClient')).toBe('@workspace.selectedClient')
			expect(resolveFilterValue('@workspace.selectedClient', { workspace: {} })).toBe('@workspace.selectedClient')
			expect(resolveFilterValue('@workspace.selectedClient', { workspace: { selectedClient: '' } })).toBe('@workspace.selectedClient')
		})

		it('threads workspace ctx through resolveFilterTokens', () => {
			const out = resolveFilterTokens({ client: '@workspace.selectedClient' }, { workspace: { selectedClient: 'c-9' } })
			expect(out.client).toBe('c-9')
		})
	})

	describe('config-context tokens (@config.<key>)', () => {
		it('resolves @config.<key> from ctx.config', () => {
			const ctx = { config: { currency: 'USD', fiscalYear: '2026' } }
			expect(resolveFilterValue('@config.currency', ctx)).toBe('USD')
			expect(resolveFilterValue('@config.fiscalYear', ctx)).toBe('2026')
		})

		it('passes through a required @config token when unset (so a literal default can apply)', () => {
			expect(resolveFilterValue('@config.currency')).toBe('@config.currency')
			expect(resolveFilterValue('@config.currency', { config: {} })).toBe('@config.currency')
			expect(resolveFilterValue('@config.currency', { config: { currency: '' } })).toBe('@config.currency')
		})

		it('threads config ctx through resolveFilterTokens', () => {
			const out = resolveFilterTokens({ vat: { eq: '@config.vatRate' } }, { config: { vatRate: 21 } })
			expect(out.vat.eq).toBe(21)
		})

		it('treats @config.<key>? as optional — flagged by isOptionalUnresolved and dropped', () => {
			// Optional, unset → stays the raw token, recognised as optional-unresolved.
			const resolved = resolveFilterValue('@config.currency?', { config: {} })
			expect(resolved).toBe('@config.currency?')
			expect(isOptionalUnresolved(resolved)).toBe(true)
			// dropOptionalUnresolved removes it; a required @config token survives.
			const out = dropOptionalUnresolved({
				ccy: '@config.currency?',
				year: '@config.fiscalYear',
			})
			expect(out).toEqual({ year: '@config.fiscalYear' })
			// hasUnresolvedTokens ignores the optional one but flags the required one.
			expect(hasUnresolvedTokens({ ccy: '@config.currency?' })).toBe(false)
			expect(hasUnresolvedTokens({ year: '@config.fiscalYear' })).toBe(true)
		})

		it('optional @config token resolves to the value when set', () => {
			expect(resolveFilterValue('@config.currency?', { config: { currency: 'GBP' } })).toBe('GBP')
		})
	})

	describe('hasUnresolvedTokens', () => {
		it('detects an unresolved token in equality and operator shapes', () => {
			expect(hasUnresolvedTokens({ client: '@workspace.selectedClient' })).toBe(true)
			expect(hasUnresolvedTokens({ date: { gt: '@today' } })).toBe(true)
		})

		it('returns false once every token resolved', () => {
			expect(hasUnresolvedTokens({ client: 'c-1', status: 'open' })).toBe(false)
			expect(hasUnresolvedTokens({})).toBe(false)
			expect(hasUnresolvedTokens(null)).toBe(false)
		})

		it('pairs with resolveFilterTokens — unresolved workspace token stays flagged', () => {
			const out = resolveFilterTokens({ client: '@workspace.selectedClient' }, { workspace: {} })
			expect(hasUnresolvedTokens(out)).toBe(true)
			const out2 = resolveFilterTokens({ client: '@workspace.selectedClient' }, { workspace: { selectedClient: 'c-1' } })
			expect(hasUnresolvedTokens(out2)).toBe(false)
		})
	})
})
