/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for the kb-search provider seam (#91 Wave 3): the built-in default
 * endpoint provider (query + space/tags/limit params, non-OK rejection),
 * the response normaliser, and resolveKbProvider's registry fallback.
 */

import {
	BUILT_IN_KB_PROVIDERS,
	defaultKbProvider,
	normaliseKbResults,
	resolveKbProvider,
} from '../../src/utils/kbSearchProviders.js'

describe('normaliseKbResults', () => {
	it('unwraps array / results / items / articles shapes and defaults to []', () => {
		expect(normaliseKbResults([{ title: 'a' }])).toHaveLength(1)
		expect(normaliseKbResults({ results: [{ title: 'b' }] })).toHaveLength(1)
		expect(normaliseKbResults({ items: [{ title: 'c' }] })).toHaveLength(1)
		expect(normaliseKbResults({ articles: [{ title: 'd' }] })).toHaveLength(1)
		expect(normaliseKbResults(null)).toEqual([])
	})
})

describe('resolveKbProvider', () => {
	it('resolves a key against the registry, falling back to default', () => {
		const xwiki = { search: jest.fn() }
		const registry = { ...BUILT_IN_KB_PROVIDERS, xwiki }
		expect(resolveKbProvider('xwiki', registry)).toBe(xwiki)
		expect(resolveKbProvider('nope', registry)).toBe(defaultKbProvider)
		expect(resolveKbProvider(undefined, registry)).toBe(defaultKbProvider)
	})

	it('falls back to the library built-in default with no registry', () => {
		expect(resolveKbProvider('default')).toBe(defaultKbProvider)
	})
})

describe('defaultKbProvider.search', () => {
	afterEach(() => {
		if (global.fetch && global.fetch.mockReset) global.fetch.mockReset()
	})

	it('GETs the endpoint with query + space + tags + limit and normalises the body', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ results: [{ title: 'Reset the printer' }] }),
		})
		const articles = await defaultKbProvider.search('printer', {
			endpoint: '/apps/openregister/api/integrations/xwiki/search',
			queryParam: 'q',
			space: 'Support',
			tags: ['printer', 'network'],
			limit: 5,
		})
		expect(articles).toEqual([{ title: 'Reset the printer' }])
		const url = global.fetch.mock.calls[0][0]
		expect(url).toContain('q=printer')
		expect(url).toContain('space=Support')
		expect(url).toContain('tags=printer%2Cnetwork')
		expect(url).toContain('limit=5')
	})

	it('rejects on a non-OK response so the widget shows its fallback', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 })
		await expect(defaultKbProvider.search('x', {})).rejects.toThrow('503')
	})
})
