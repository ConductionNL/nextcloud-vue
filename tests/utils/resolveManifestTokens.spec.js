/**
 * Unit tests for the single shared resolver-dispatch entrypoint
 * (manifest-sentinel-token-registry, audit item 23).
 *
 * Asserts one entrypoint routes each token to its owning resolver by context,
 * returns the resolved subtree plus an `unresolved` list, and emits a one-time
 * deprecation warning naming the replacement.
 */

import {
	resolveManifestSubtree,
	warnIfDeprecated,
	clearDeprecationWarnings,
	SENTINEL_RESOLVERS,
} from '../../src/utils/resolveManifestTokens.js'
import { SENTINEL_CONTEXTS } from '../../src/utils/sentinelTokens.js'
import { clearRouteSentinelWarnings } from '../../src/utils/resolveRouteSentinels.js'

beforeEach(() => {
	clearDeprecationWarnings()
	clearRouteSentinelWarnings()
})

describe('SENTINEL_RESOLVERS dispatch table', () => {
	it('names a resolver for every canonical context', () => {
		for (const ctx of SENTINEL_CONTEXTS) {
			expect(typeof SENTINEL_RESOLVERS[ctx]).toBe('string')
			expect(SENTINEL_RESOLVERS[ctx].length).toBeGreaterThan(0)
		}
	})
})

describe('resolveManifestSubtree — one entrypoint resolves across contexts', () => {
	it('routes a filter token, an object-context token, and a route token in one pass', () => {
		const subtree = {
			assignee: '@me',
			zaak: '@objectId',
			caseId: '@route.caseId',
			literal: 'unchanged',
		}
		const { value } = resolveManifestSubtree(subtree, {
			params: { caseId: 'case-42' },
			ctx: { objectId: 'obj-7' },
			warn: () => {},
		})
		expect(value.zaak).toBe('obj-7')
		expect(value.caseId).toBe('case-42')
		expect(value.literal).toBe('unchanged')
		// @me resolves against @nextcloud/auth (jsdom → '' fallback), but is
		// no longer a raw token.
		expect(value.assignee).not.toBe('@me')
	})

	it('collects unresolved render-time tokens (object token without ctx)', () => {
		const { value, unresolved } = resolveManifestSubtree(
			{ zaak: '@objectId', when: '@today' },
			{ warn: () => {} },
		)
		expect(value.zaak).toBe('@objectId') // no ctx → stays raw
		expect(unresolved).toContain('@objectId')
		expect(unresolved).not.toContain('@today') // @today always resolves
	})

	it('does NOT count optional workspace tokens as unresolved', () => {
		const { unresolved } = resolveManifestSubtree(
			{ d: '@workspace.dateFrom?' },
			{ warn: () => {} },
		)
		expect(unresolved).not.toContain('@workspace.dateFrom?')
	})

	it('leaves load-time (@resolve) + server-side (@self) tokens untouched and unlisted', () => {
		const { value, unresolved } = resolveManifestSubtree(
			{ register: '@resolve:foo', ref: '@self.id' },
			{ warn: () => {} },
		)
		expect(value.register).toBe('@resolve:foo')
		expect(value.ref).toBe('@self.id')
		expect(unresolved).toEqual([])
	})

	it('does not mutate the input subtree', () => {
		const input = { zaak: '@objectId' }
		resolveManifestSubtree(input, { ctx: { objectId: 'x' }, warn: () => {} })
		expect(input.zaak).toBe('@objectId')
	})
})

describe('deprecation warnings — resolve AND warn once', () => {
	it('@currentFiscalYear resolves AND warns naming @config.fiscalYear', () => {
		const warn = jest.fn()
		const { value } = resolveManifestSubtree({ y: '@currentFiscalYear' }, { warn })
		expect(value.y).toBe(String(new Date().getFullYear())) // still resolved
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0][0]).toContain('@currentFiscalYear')
		expect(warn.mock.calls[0][0]).toContain('@config.fiscalYear')
	})

	it('warns once even across many references', () => {
		const warn = jest.fn()
		resolveManifestSubtree({ a: '@currentFiscalYear', b: '@currentFiscalYear' }, { warn })
		resolveManifestSubtree({ c: '@currentFiscalYear' }, { warn })
		expect(warn).toHaveBeenCalledTimes(1)
	})

	it('warnIfDeprecated returns false for canonical tokens', () => {
		const warn = jest.fn()
		expect(warnIfDeprecated('@me', warn)).toBe(false)
		expect(warn).not.toHaveBeenCalled()
	})

	it('@page.period warns naming @workspace.<key>', () => {
		const warn = jest.fn()
		resolveManifestSubtree({ period: '@page.period' }, { warn })
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0][0]).toContain('@workspace.<key>')
	})
})
