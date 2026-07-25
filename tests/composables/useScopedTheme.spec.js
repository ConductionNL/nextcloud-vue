/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Jest spec for useScopedTheme — fetch, verify-flat-`:root`, rewrite,
 * inject, teardown, and the listTokenSets/evaluateContrast wrappers.
 *
 * Spec: scoped-theme-applier (REQ-STA-1, REQ-STA-2).
 */
import { useScopedTheme, rewriteRootScope, clearScopedThemeCache, SCOPE_ATTR } from '../../src/composables/useScopedTheme.js'

const TOKEN_CSS = ':root {\n  --nldesign-color-primary: #004699;\n  --nldesign-color-bg: #FFFFFF;\n}\n'

const manifest = (tokenSet) => ({ runtime: { theme: { source: 'nldesign', tokenSet, tokenSetName: 'X' } } })

/** Minimal fake DOM: head with appendChild + querySelectorAll. */
function fakeDoc() {
	const head = { children: [] }
	const doc = {
		head,
		createElement() {
			return { _attrs: {}, setAttribute(k, v) { this._attrs[k] = v }, getAttribute(k) { return this._attrs[k] }, textContent: '', parentNode: null }
		},
		querySelectorAll(sel) {
			const m = /style\[data-nldesign-theme="([^"]+)"\]/.exec(sel)
			const slug = m && m[1]
			return head.children.filter((el) => el._attrs['data-nldesign-theme'] === slug)
		},
	}
	head.appendChild = (el) => { el.parentNode = { removeChild: (c) => { head.children = head.children.filter((x) => x !== c) } }; head.children.push(el) }
	return doc
}

describe('SCOPE_ATTR', () => {
	it('is the design-system-owned scope attribute name', () => {
		expect(SCOPE_ATTR).toBe('data-nldesign-theme-scope')
	})
})

describe('rewriteRootScope', () => {
	it('rewrites :root to the scoped attribute selector', () => {
		const out = rewriteRootScope(TOKEN_CSS, '[data-nldesign-theme-scope="petstore"]')
		expect(out).toContain('[data-nldesign-theme-scope="petstore"] {')
		expect(out).toContain('--nldesign-color-primary: #004699')
		expect(out).not.toContain(':root')
	})

	it('bails out (null) on any at-rule', () => {
		expect(rewriteRootScope(':root { --x: 1; } @media (max-width: 1px) { :root { --y: 2; } }', '[x]')).toBeNull()
	})

	it('bails out (null) on a non-:root selector', () => {
		expect(rewriteRootScope('.foo { color: red; }', '[x]')).toBeNull()
	})

	it('bails out (null) on nested rules', () => {
		expect(rewriteRootScope(':root { --x: 1; .nested { color: red; } }', '[x]')).toBeNull()
	})

	it('tolerates comments', () => {
		const out = rewriteRootScope('/* c */ :root { --a: 1; }', '[s]')
		expect(out).toContain('[s] {')
	})

	it('returns null for empty input', () => {
		expect(rewriteRootScope('', '[x]')).toBeNull()
	})
})

describe('useScopedTheme — apply/teardown', () => {
	beforeEach(() => clearScopedThemeCache())

	it('fetches, rewrites and injects exactly one scoped style element (flat :root)', async () => {
		const doc = fakeDoc()
		const client = { get: jest.fn().mockResolvedValue({ data: TOKEN_CSS }) }
		const theme = useScopedTheme({ doc, client })
		const injected = await theme.apply(manifest('gemeente-blauw'), 'petstore')

		expect(injected).toBe(true)
		expect(doc.head.children).toHaveLength(1)
		const el = doc.head.children[0]
		expect(el._attrs['data-nldesign-theme']).toBe('petstore')
		expect(el.textContent).toContain('[data-nldesign-theme-scope="petstore"]')
		expect(el.textContent).not.toContain(':root')
	})

	it('is idempotent — re-apply replaces, never duplicates', async () => {
		const doc = fakeDoc()
		const client = { get: jest.fn().mockResolvedValue({ data: TOKEN_CSS }) }
		const theme = useScopedTheme({ doc, client })
		await theme.apply(manifest('gemeente-blauw'), 'petstore')
		await theme.apply(manifest('gemeente-blauw'), 'petstore')
		expect(doc.head.children).toHaveLength(1)
	})

	it('teardown removes the managed element and is a safe no-op when nothing was applied', async () => {
		const doc = fakeDoc()
		const client = { get: jest.fn().mockResolvedValue({ data: TOKEN_CSS }) }
		const theme = useScopedTheme({ doc, client })
		await theme.apply(manifest('gemeente-blauw'), 'petstore')
		theme.teardown('petstore')
		expect(doc.head.children).toHaveLength(0)

		expect(() => theme.teardown('petstore')).not.toThrow()
	})

	it('caches per token set (one fetch for repeated applies)', async () => {
		const doc = fakeDoc()
		const client = { get: jest.fn().mockResolvedValue({ data: TOKEN_CSS }) }
		const theme = useScopedTheme({ doc, client })
		await theme.apply(manifest('gemeente-blauw'), 'a')
		await theme.apply(manifest('gemeente-blauw'), 'b')
		expect(client.get).toHaveBeenCalledTimes(1)
	})

	it('degrades to default styling with a warning on fetch failure (404/network/nldesign absent)', async () => {
		const doc = fakeDoc()
		const warn = jest.fn()
		const client = { get: jest.fn().mockRejectedValue({ response: { status: 404 } }) }
		const theme = useScopedTheme({ doc, client, warn })
		const injected = await theme.apply(manifest('ghost'), 'petstore')
		expect(injected).toBe(false)
		expect(doc.head.children).toHaveLength(0)
		expect(warn).toHaveBeenCalledTimes(1)
	})

	it('injects nothing and warns when the stylesheet has at-rules (bail-and-degrade)', async () => {
		const doc = fakeDoc()
		const warn = jest.fn()
		const client = { get: jest.fn().mockResolvedValue({ data: '@media all { :root { --x: 1; } }' }) }
		const theme = useScopedTheme({ doc, client, warn })
		const injected = await theme.apply(manifest('weird'), 'petstore')
		expect(injected).toBe(false)
		expect(doc.head.children).toHaveLength(0)
		expect(warn).toHaveBeenCalledTimes(1)
	})

	it('no-ops (and clears) a themeless manifest, never fetching', async () => {
		const doc = fakeDoc()
		const client = { get: jest.fn() }
		const theme = useScopedTheme({ doc, client })
		const injected = await theme.apply({ runtime: {} }, 'petstore')
		expect(injected).toBe(false)
		expect(client.get).not.toHaveBeenCalled()
	})

	it('no-ops when scopeId is falsy', async () => {
		const doc = fakeDoc()
		const client = { get: jest.fn().mockResolvedValue({ data: TOKEN_CSS }) }
		const theme = useScopedTheme({ doc, client })
		const injected = await theme.apply(manifest('gemeente-blauw'), '')
		expect(injected).toBe(false)
	})

})

describe('useScopedTheme — listTokenSets', () => {
	it('resolves the tokenSets array unchanged on success', async () => {
		const client = { get: jest.fn().mockResolvedValue({ data: { tokenSets: [{ id: 'gemeente-blauw', name: 'Gemeente Blauw' }] } }) }
		const theme = useScopedTheme({ doc: fakeDoc(), client })
		const result = await theme.listTokenSets()
		expect(result).toEqual([{ id: 'gemeente-blauw', name: 'Gemeente Blauw' }])
	})

	it('resolves [] on failure (nldesign absent / network error), never throws', async () => {
		const client = { get: jest.fn().mockRejectedValue(new Error('network')) }
		const theme = useScopedTheme({ doc: fakeDoc(), client })
		await expect(theme.listTokenSets()).resolves.toEqual([])
	})

	it('resolves [] on a malformed response body', async () => {
		const client = { get: jest.fn().mockResolvedValue({ data: {} }) }
		const theme = useScopedTheme({ doc: fakeDoc(), client })
		await expect(theme.listTokenSets()).resolves.toEqual([])
	})
})

describe('useScopedTheme — evaluateContrast', () => {
	it('resolves the results array on success, with no blocked/allowed/verdict key', async () => {
		const client = {
			post: jest.fn().mockResolvedValue({
				data: { results: [{ name: 'primary', ratio: 8.1, threshold: 4.5, level: 'AA', pass: true }] },
			}),
		}
		const theme = useScopedTheme({ doc: fakeDoc(), client })
		const result = await theme.evaluateContrast([{ name: 'primary', value: '#154273', role: 'text' }], '#FFFFFF')
		expect(result).toEqual([{ name: 'primary', ratio: 8.1, threshold: 4.5, level: 'AA', pass: true }])
		expect(JSON.stringify(result)).not.toMatch(/blocked|allowed|verdict/i)
	})

	it('resolves null on failure — distinct from an empty array — never throws', async () => {
		const client = { post: jest.fn().mockRejectedValue(new Error('unreachable')) }
		const theme = useScopedTheme({ doc: fakeDoc(), client })
		const result = await theme.evaluateContrast([{ name: 'primary', value: '#154273', role: 'text' }], '#FFFFFF')
		expect(result).toBeNull()
	})
})
