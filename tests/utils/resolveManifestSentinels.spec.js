/**
 * Tests for the resolveManifestSentinels utility.
 *
 * Covers REQ-MRS-001..006 scenarios from the manifest-resolve-sentinel
 * spec:
 *  - Plain string passes through unchanged
 *  - `@resolve:<key>` is replaced with the IAppConfig value
 *  - Unset key resolves to `null` + console.warn + included in
 *    unresolved
 *  - Nested object substitution
 *  - Sentinel in disallowed paths (route / id / version) is left
 *    intact (resolver only walks `pages[].config`); the validator
 *    rejects them downstream
 *  - Malformed sentinel `@resolve:` (no key) is ignored
 *  - Multiple sentinels share a single fetch (cache behaviour)
 *  - Initial-state hits avoid the network
 */

const { resolveManifestSentinels, clearResolveCache } = require('../../src/utils/resolveManifestSentinels.js')

/**
 * Build a manifest skeleton with the given pages array.
 *
 * @param {Array<object>} pages Pages array to embed in the manifest.
 * @return {object} Manifest skeleton.
 */
function manifestWith(pages) {
	return {
		version: '1.0.0',
		menu: [{ id: 'home', label: 'app.home' }],
		pages,
	}
}

describe('resolveManifestSentinels', () => {
	beforeEach(() => {
		clearResolveCache()
	})

	it('passes a manifest with no sentinels through unchanged', async () => {
		const input = manifestWith([
			{ id: 'home', route: '/', type: 'index', title: 't', config: { register: 'plain-slug', schema: 'plain' } },
		])
		const { manifest, unresolved } = await resolveManifestSentinels(input, 'myapp', {
			getAppConfigValue: jest.fn(),
		})
		expect(manifest.pages[0].config.register).toBe('plain-slug')
		expect(manifest.pages[0].config.schema).toBe('plain')
		expect(unresolved).toEqual([])
	})

	it('replaces @resolve:<key> with the IAppConfig value', async () => {
		const input = manifestWith([
			{ id: 'home', route: '/', type: 'index', title: 't', config: { register: '@resolve:theme_register' } },
		])
		const getAppConfigValue = jest.fn().mockResolvedValue('theme-2026')
		const { manifest, unresolved } = await resolveManifestSentinels(input, 'myapp', { getAppConfigValue })
		expect(manifest.pages[0].config.register).toBe('theme-2026')
		expect(unresolved).toEqual([])
		expect(getAppConfigValue).toHaveBeenCalledWith('myapp', 'theme_register')
	})

	it('substitutes null and emits a warn when the key is unset', async () => {
		const input = manifestWith([
			{ id: 'home', route: '/', type: 'index', title: 't', config: { register: '@resolve:missing_register' } },
		])
		const warn = jest.fn()
		const { manifest, unresolved } = await resolveManifestSentinels(input, 'myapp', {
			getAppConfigValue: async () => null,
			warn,
		})
		expect(manifest.pages[0].config.register).toBeNull()
		expect(unresolved).toEqual(['missing_register'])
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0][0]).toContain('missing_register')
	})

	it('treats undefined and empty string as unset', async () => {
		const input = manifestWith([
			{ id: 'a', route: '/a', type: 'index', title: 'a', config: { register: '@resolve:foo' } },
			{ id: 'b', route: '/b', type: 'index', title: 'b', config: { register: '@resolve:bar' } },
		])
		const { manifest, unresolved } = await resolveManifestSentinels(input, 'myapp', {
			getAppConfigValue: async (_, key) => (key === 'foo' ? undefined : ''),
			warn: () => {},
		})
		expect(manifest.pages[0].config.register).toBeNull()
		expect(manifest.pages[1].config.register).toBeNull()
		expect(unresolved.sort()).toEqual(['bar', 'foo'])
	})

	it('substitutes nested config fields at any depth', async () => {
		const input = manifestWith([
			{
				id: 'settings',
				route: '/settings',
				type: 'settings',
				title: 't',
				config: {
					sections: [
						{ title: 'x', saveEndpoint: '@resolve:settings_endpoint' },
					],
				},
			},
		])
		const { manifest } = await resolveManifestSentinels(input, 'myapp', {
			getAppConfigValue: async () => '/api/save',
		})
		expect(manifest.pages[0].config.sections[0].saveEndpoint).toBe('/api/save')
	})

	it('leaves sentinels in route / id / top-level version intact (resolver only walks pages[].config)', async () => {
		const input = {
			version: '@resolve:app_version', // resolver does NOT touch this
			menu: [{ id: 'home', label: 'l', route: '@resolve:home_route' }],
			pages: [
				{ id: '@resolve:weird_id', route: '@resolve:my_route', type: 'index', title: 't', config: { register: '@resolve:cfg' } },
			],
		}
		const getAppConfigValue = jest.fn(async (_, key) => key === 'cfg' ? 'resolved' : 'should-not-be-called')
		const { manifest } = await resolveManifestSentinels(input, 'myapp', { getAppConfigValue })
		// The resolver MUST NOT substitute outside pages[].config:
		expect(manifest.version).toBe('@resolve:app_version')
		expect(manifest.menu[0].route).toBe('@resolve:home_route')
		expect(manifest.pages[0].id).toBe('@resolve:weird_id')
		expect(manifest.pages[0].route).toBe('@resolve:my_route')
		// But the config sentinel IS substituted:
		expect(manifest.pages[0].config.register).toBe('resolved')
		// And ONLY `cfg` was looked up — the others must be ignored.
		expect(getAppConfigValue).toHaveBeenCalledTimes(1)
		expect(getAppConfigValue).toHaveBeenCalledWith('myapp', 'cfg')
	})

	it('ignores partial sentinels (`prefix-@resolve:foo`)', async () => {
		const input = manifestWith([
			{ id: 'home', route: '/', type: 'index', title: 't', config: { register: 'prefix-@resolve:foo' } },
		])
		const getAppConfigValue = jest.fn()
		const { manifest, unresolved } = await resolveManifestSentinels(input, 'myapp', { getAppConfigValue })
		expect(manifest.pages[0].config.register).toBe('prefix-@resolve:foo')
		expect(unresolved).toEqual([])
		expect(getAppConfigValue).not.toHaveBeenCalled()
	})

	it('ignores malformed sentinels (`@resolve:`, `@resolve:UPPER`, `@resolve:9bad`)', async () => {
		const input = manifestWith([
			{ id: 'a', route: '/a', type: 'index', title: 'a', config: { register: '@resolve:' } },
			{ id: 'b', route: '/b', type: 'index', title: 'b', config: { register: '@resolve:UPPER' } },
			{ id: 'c', route: '/c', type: 'index', title: 'c', config: { register: '@resolve:9bad' } },
		])
		const getAppConfigValue = jest.fn()
		const { manifest, unresolved } = await resolveManifestSentinels(input, 'myapp', { getAppConfigValue })
		expect(manifest.pages[0].config.register).toBe('@resolve:')
		expect(manifest.pages[1].config.register).toBe('@resolve:UPPER')
		expect(manifest.pages[2].config.register).toBe('@resolve:9bad')
		expect(unresolved).toEqual([])
		expect(getAppConfigValue).not.toHaveBeenCalled()
	})

	it('resolves multiple sentinels with a single fetch per unique key', async () => {
		const input = manifestWith([
			{ id: 'a', route: '/a', type: 'index', title: 'a', config: { register: '@resolve:shared_key' } },
			{ id: 'b', route: '/b', type: 'index', title: 'b', config: { register: '@resolve:shared_key' } },
			{ id: 'c', route: '/c', type: 'index', title: 'c', config: { register: '@resolve:shared_key' } },
			{ id: 'd', route: '/d', type: 'index', title: 'd', config: { register: '@resolve:other_key' } },
		])
		const getAppConfigValue = jest.fn(async (_, key) => `value-${key}`)
		const { manifest } = await resolveManifestSentinels(input, 'myapp', { getAppConfigValue })
		expect(manifest.pages[0].config.register).toBe('value-shared_key')
		expect(manifest.pages[1].config.register).toBe('value-shared_key')
		expect(manifest.pages[2].config.register).toBe('value-shared_key')
		expect(manifest.pages[3].config.register).toBe('value-other_key')
		// Two unique keys, two calls — not four.
		expect(getAppConfigValue).toHaveBeenCalledTimes(2)
	})

	it('returns unresolved entries with the correct keys when a mix of resolved/unresolved sentinels are present', async () => {
		const input = manifestWith([
			{ id: 'a', route: '/a', type: 'index', title: 'a', config: { register: '@resolve:foo' } },
			{ id: 'b', route: '/b', type: 'index', title: 'b', config: { register: '@resolve:bar' } },
			{ id: 'c', route: '/c', type: 'index', title: 'c', config: { register: '@resolve:baz' } },
		])
		const { manifest, unresolved } = await resolveManifestSentinels(input, 'myapp', {
			getAppConfigValue: async (_, key) => (key === 'foo' ? 'foo-value' : null),
			warn: () => {},
		})
		expect(manifest.pages[0].config.register).toBe('foo-value')
		expect(manifest.pages[1].config.register).toBeNull()
		expect(manifest.pages[2].config.register).toBeNull()
		expect(unresolved.sort()).toEqual(['bar', 'baz'])
	})

	it('does not mutate the input manifest', async () => {
		const input = manifestWith([
			{ id: 'home', route: '/', type: 'index', title: 't', config: { register: '@resolve:foo' } },
		])
		const snapshot = JSON.parse(JSON.stringify(input))
		await resolveManifestSentinels(input, 'myapp', {
			getAppConfigValue: async () => 'resolved',
		})
		expect(input).toEqual(snapshot)
	})

	it('handles arrays under config', async () => {
		const input = manifestWith([
			{
				id: 'a',
				route: '/a',
				type: 'index',
				title: 'a',
				config: {
					columns: ['title', '@resolve:hidden_col_key'],
					actions: [
						{ id: 'edit', label: 'Edit', endpoint: '@resolve:edit_endpoint' },
					],
				},
			},
		])
		const { manifest } = await resolveManifestSentinels(input, 'myapp', {
			getAppConfigValue: async (_, key) => `value-${key}`,
		})
		expect(manifest.pages[0].config.columns).toEqual(['title', 'value-hidden_col_key'])
		expect(manifest.pages[0].config.actions[0].endpoint).toBe('value-edit_endpoint')
	})

	it('returns the manifest unchanged when the input is not a plain object', async () => {
		const result = await resolveManifestSentinels(null, 'myapp')
		expect(result.manifest).toBeNull()
		expect(result.unresolved).toEqual([])
	})
})
