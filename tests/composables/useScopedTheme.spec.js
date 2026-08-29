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

/*
 * `generateFilePath` needs Nextcloud's `OC.appswebroots` to put `/apps/<id>/`
 * in front of a file, and outside a browser there is no such global — it
 * degrades to a bare `/css/tokens/x.css` with the app id dropped entirely.
 * That silently erases the one thing several tests below are about (WHICH app
 * id was requested), so the router is mocked to the shape it really has in a
 * browser. `generateUrl` already carries the id in its argument and is passed
 * through unchanged.
 *
 * Declared after the import only to satisfy `import/first`; babel hoists
 * `jest.mock` above the imports either way.
 */
jest.mock('@nextcloud/router', () => ({
	generateFilePath: (app, type, file) => `/apps/${app}/${type}/${file}`,
	generateUrl: (path) => path,
}))

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

describe('useScopedTheme — the theme app id is resolved, not assumed', () => {
	beforeEach(() => clearScopedThemeCache())

	/**
	 * A client whose GET answers only for URLs naming one app id.
	 *
	 * @param {string} slug - the app id that answers; anything else 404s.
	 * @param {*} data - the body that id returns.
	 * @return {{get: Function}} An axios-like client double.
	 */
	const onlyFor = (slug, data) => ({
		get: jest.fn(async (url) => {
			if (!url.includes(`/${slug}/`)) {
				const e = new Error('not found')
				e.response = { status: 404 }
				throw e
			}
			return { data }
		}),
	})

	it('falls back to the renamed app id when the old one is absent', async () => {
		const doc = fakeDoc()
		const client = onlyFor('thematiq', TOKEN_CSS)
		const theme = useScopedTheme({ doc, client, warn: jest.fn() })

		expect(await theme.apply(manifest('gemeente-blauw'), 'petstore')).toBe(true)
		expect(client.get.mock.calls.some(([url]) => url.includes('/thematiq/'))).toBe(true)
	})

	it('still themes through the old app id, which is what is deployed today', async () => {
		const doc = fakeDoc()
		const client = onlyFor('nldesign', TOKEN_CSS)
		const theme = useScopedTheme({ doc, client, warn: jest.fn() })

		expect(await theme.apply(manifest('gemeente-blauw'), 'petstore')).toBe(true)
		// The deployed id is tried first, so the common case costs one request.
		expect(client.get).toHaveBeenCalledTimes(1)
	})

	it('remembers the id that answered instead of re-probing the dead one', async () => {
		const doc = fakeDoc()
		const client = onlyFor('thematiq', TOKEN_CSS)
		const theme = useScopedTheme({ doc, client, warn: jest.fn() })

		await theme.apply(manifest('set-a'), 'petstore')
		const afterFirst = client.get.mock.calls.length
		await theme.apply(manifest('set-b'), 'petstore')

		// Second apply is a different token set, so it really fetches — but it
		// goes straight to the id that worked rather than paying the 404 again.
		expect(client.get.mock.calls.length).toBe(afterFirst + 1)
		expect(client.get.mock.calls.at(-1)[0]).toContain('/thematiq/')
	})

	it('treats an HTML body as "this app did not answer", not as a stylesheet', async () => {
		const doc = fakeDoc()
		// Nextcloud serves its login/error page with a 200, so status alone
		// cannot tell a real stylesheet from a redirect to the login screen.
		const client = {
			get: jest.fn(async (url) => (url.includes('/thematiq/')
				? { data: TOKEN_CSS }
				: { data: '<!DOCTYPE html><html><body>login</body></html>' })),
		}
		const theme = useScopedTheme({ doc, client, warn: jest.fn() })

		expect(await theme.apply(manifest('gemeente-blauw'), 'petstore')).toBe(true)
		expect(doc.head.children).toHaveLength(1)
		expect(doc.head.children[0].textContent).toContain('--nldesign-color-primary')
	})

	it('pins exactly one id when the caller names it, probing nothing else', async () => {
		const doc = fakeDoc()
		const client = onlyFor('thematiq', TOKEN_CSS)
		const theme = useScopedTheme({ doc, client, warn: jest.fn(), appSlug: 'nldesign' })

		expect(await theme.apply(manifest('gemeente-blauw'), 'petstore')).toBe(false)
		expect(client.get).toHaveBeenCalledTimes(1)
		expect(client.get.mock.calls[0][0]).toContain('/nldesign/')
	})

	it('resolves the id for listTokenSets too, not just the stylesheet', async () => {
		const client = onlyFor('thematiq', { tokenSets: [{ id: 'gemeente-blauw', name: 'Gemeente Blauw' }] })
		const theme = useScopedTheme({ doc: fakeDoc(), client })

		expect(await theme.listTokenSets()).toEqual([{ id: 'gemeente-blauw', name: 'Gemeente Blauw' }])
	})

	it('resolves the id for evaluateContrast too', async () => {
		const client = {
			post: jest.fn(async (url) => {
				if (!url.includes('/thematiq/')) {
					throw new Error('not found')
				}
				return { data: { results: [{ name: 'primary', ratio: 8.1 }] } }
			}),
		}
		const theme = useScopedTheme({ doc: fakeDoc(), client })

		expect(await theme.evaluateContrast([{ name: 'primary', value: '#154273', role: 'text' }], '#FFFFFF'))
			.toEqual([{ name: 'primary', ratio: 8.1 }])
	})
})
