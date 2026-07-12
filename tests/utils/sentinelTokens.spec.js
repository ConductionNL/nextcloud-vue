/**
 * Unit tests for the closed sentinel-token vocabulary
 * (manifest-sentinel-token-registry, audit item 23):
 * context classification, deprecation matching, and the scanManifestTokens
 * gate core.
 */

import {
	SENTINEL_CONTEXTS,
	SENTINEL_DEPRECATIONS,
	contextOf,
	isKnownToken,
	matchDeprecation,
	classifyToken,
	looksLikeSentinel,
	scanManifestTokens,
} from '../../src/utils/sentinelTokens.js'

describe('contextOf / isKnownToken', () => {
	it.each([
		['@me', 'filter'],
		['@today', 'filter'],
		['@today-30d', 'filter'],
		['@today+7d', 'filter'],
		['@monthStart', 'filter'],
		['@quarterStart', 'filter'],
		['@yearStart', 'filter'],
		['@resolve:woo_register', 'config'],
		['@config.currency', 'config'],
		['@config.fiscalYear?', 'config'],
		['@objectId', 'object'],
		['@object.learnerId', 'object'],
		['@workspace.period', 'workspace'],
		['@workspace.dateFrom?', 'workspace'],
		['@route.id', 'route'],
		['@route.catalogSlug', 'route'],
		['@self.id', 'declarative'],
		['@self.administrationId', 'declarative'],
		['@ref:foo/bar', 'declarative'],
		['@aggregate:sum(amount)', 'declarative'],
		['@total', 'visibleWhen'],
	])('classifies %s as %s', (token, ctx) => {
		expect(contextOf(token)).toBe(ctx)
		expect(isKnownToken(token)).toBe(true)
		expect(SENTINEL_CONTEXTS).toContain(ctx)
	})

	it.each([
		['@yearStrt'],
		['@runtimeFoo'],
		['@object.'],
		['@page'],
		['@currentFiscalYear'], // deprecated ≠ canonical
		['not-a-token'],
		['@'],
	])('does not classify %s as a canonical member', (token) => {
		expect(contextOf(token)).toBeNull()
		expect(isKnownToken(token)).toBe(false)
	})
})

describe('looksLikeSentinel', () => {
	it('true only for @-prefixed strings', () => {
		expect(looksLikeSentinel('@me')).toBe(true)
		expect(looksLikeSentinel('@invented')).toBe(true)
		expect(looksLikeSentinel('me')).toBe(false)
		expect(looksLikeSentinel(42)).toBe(false)
		expect(looksLikeSentinel(null)).toBe(false)
	})
})

describe('matchDeprecation', () => {
	it('maps @currentFiscalYear → @config.fiscalYear', () => {
		const d = matchDeprecation('@currentFiscalYear')
		expect(d).toMatchObject({ key: '@currentFiscalYear', replacement: '@config.fiscalYear' })
		expect(d.removal).toMatch(/^\d{4}-\d{2}-\d{2}$/)
	})

	it('maps @page.<key> family → @workspace.<key>', () => {
		expect(matchDeprecation('@page.period')).toMatchObject({ key: '@page.<key>', replacement: '@workspace.<key>' })
		expect(matchDeprecation('@page.granularity').replacement).toBe('@workspace.<key>')
	})

	it('maps @runtime family → removal (null replacement)', () => {
		expect(matchDeprecation('@runtime')).toMatchObject({ replacement: null })
		expect(matchDeprecation('@runtime.foo')).toMatchObject({ replacement: null })
	})

	it('returns null for canonical + unknown tokens', () => {
		expect(matchDeprecation('@me')).toBeNull()
		expect(matchDeprecation('@yearStrt')).toBeNull()
	})

	it('every deprecation entry has a test regex, removal date, and note', () => {
		for (const [, entry] of Object.entries(SENTINEL_DEPRECATIONS)) {
			expect(entry.test).toBeInstanceOf(RegExp)
			expect(entry.removal).toMatch(/^\d{4}-\d{2}-\d{2}$/)
			expect(typeof entry.note).toBe('string')
		}
	})
})

describe('classifyToken', () => {
	it('known / deprecated / unknown buckets', () => {
		expect(classifyToken('@objectId')).toMatchObject({ status: 'known', context: 'object' })
		expect(classifyToken('@currentFiscalYear')).toMatchObject({ status: 'deprecated' })
		expect(classifyToken('@page.period').status).toBe('deprecated')
		expect(classifyToken('@runtimeFoo')).toMatchObject({ status: 'unknown', context: null })
	})
})

describe('scanManifestTokens (gate core)', () => {
	const mk = (config, widgets) => ({
		pages: [{ id: 'p', config, ...(widgets ? { widgets } : {}) }],
	})

	it('buckets known, deprecated, and unknown tokens under pages[].config', () => {
		const m = mk({
			filter: { assignee: '@me', d: '@yearStrt' },
			register: '@resolve:foo',
			dataSource: { filters: { y: '@currentFiscalYear' } },
		})
		const r = scanManifestTokens(m)
		expect(r.unknown.map((u) => u.token)).toEqual(['@yearStrt'])
		expect(r.deprecated.map((u) => u.token)).toEqual(['@currentFiscalYear'])
		expect(r.known).toBe(2) // @me + @resolve:foo
	})

	it('scans top-level page widgets[] too', () => {
		const m = mk(undefined, [{ dataSource: { filter: { d: '@totallyInvented', ok: '@workspace.period' } } }])
		const r = scanManifestTokens(m)
		expect(r.unknown.map((u) => u.token)).toEqual(['@totallyInvented'])
		expect(r.known).toBe(1)
	})

	it('reports a path for each finding', () => {
		const r = scanManifestTokens(mk({ filter: { d: '@nope' } }))
		expect(r.unknown[0].path).toBe('pages[0].config.filter.d')
	})

	it('carries the replacement + removal on deprecated findings', () => {
		const r = scanManifestTokens(mk({ x: '@page.period' }))
		expect(r.deprecated[0]).toMatchObject({ token: '@page.period', replacement: '@workspace.<key>' })
	})

	it('ignores non-@ strings and empty manifests', () => {
		expect(scanManifestTokens({})).toEqual({ unknown: [], deprecated: [], known: 0 })
		expect(scanManifestTokens(mk({ title: 'Hello', register: 'plain-slug' })).known).toBe(0)
	})
})
