/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `prefixUrl()` is applied at hundreds of call sites across the component
 * fleet (WOO-560), which changes what has to be true of it. A helper used
 * once only has to be right for the one value it is given; a helper wrapped
 * around every API path in the library has to be INERT on everything that is
 * not an app-relative path, because sooner or later one of those call sites
 * will hand it an absolute URL, a data: URI, or a path it already prefixed.
 *
 * The two failure modes that matter, and that these tests pin:
 *
 *   1. Double-prefixing — `/index.php/index.php/apps/...`, a 404 that looks
 *      like a routing bug rather than a string bug.
 *   2. Mangling a non-path — `/index.phphttps://host/...`, which is not even
 *      a URL, from a call site that passed a fully-qualified address.
 *
 * The prefix itself is decided from `window.location.pathname`, so the
 * instance's own URL shape drives it: on a pretty-URL instance nothing is
 * added, and on an instance without mod_rewrite the page itself is served
 * under `/index.php` and the API paths must match it.
 */
const { prefixUrl } = require('../../src/utils/headers.js')

/**
 * Point `window.location.pathname` at a page URL.
 *
 * jsdom's `window.location` is not writable, so replace the whole object.
 *
 * @param {string} pathname The pathname the page is served under.
 */
function servePageAt(pathname) {
	delete window.location
	window.location = { pathname }
}

describe('prefixUrl', () => {
	afterEach(() => {
		servePageAt('/apps/openregister/')
	})

	describe('on an instance WITHOUT pretty URLs (page served under /index.php)', () => {
		beforeEach(() => {
			servePageAt('/index.php/apps/portaliq/portals/42')
		})

		it('prefixes an app-relative API path', () => {
			expect(prefixUrl('/apps/openregister/api/objects'))
				.toBe('/index.php/apps/openregister/api/objects')
		})

		it('is idempotent — a path that already carries the prefix is returned unchanged', () => {
			// The regression guard for double-wrapping: a call site that was
			// already correct must not break when the sweep wraps it again.
			const already = '/index.php/apps/openregister/api/objects'
			expect(prefixUrl(already)).toBe(already)
			expect(prefixUrl(prefixUrl('/apps/openregister/api/objects')))
				.toBe('/index.php/apps/openregister/api/objects')
		})

		it.each([
			['https://example.org/apps/openregister/api/objects'],
			['http://nextcloud.local/apps/openregister/api/objects'],
			['//cdn.example.org/asset.png'],
			['data:application/json;base64,e30='],
			['blob:https://example.org/9a1c'],
			['mailto:info@conduction.nl'],
		])('leaves %s alone', (value) => {
			expect(prefixUrl(value)).toBe(value)
		})

		it('leaves a document-relative path alone', () => {
			// Prefixing would change what the path resolves against, which is a
			// different bug from the one this helper exists to fix.
			expect(prefixUrl('api/objects')).toBe('api/objects')
			expect(prefixUrl('./api/objects')).toBe('./api/objects')
			expect(prefixUrl('../api/objects')).toBe('../api/objects')
		})
	})

	describe('on an instance WITH pretty URLs', () => {
		beforeEach(() => {
			servePageAt('/apps/portaliq/portals/42')
		})

		it('returns an app-relative path untouched', () => {
			expect(prefixUrl('/apps/openregister/api/objects'))
				.toBe('/apps/openregister/api/objects')
		})

		it('still returns an explicitly prefixed path untouched', () => {
			// Both forms route here, so a path that names /index.php itself is
			// left as the caller wrote it rather than being "corrected".
			expect(prefixUrl('/index.php/apps/openregister/api/objects'))
				.toBe('/index.php/apps/openregister/api/objects')
		})
	})

	describe('degenerate input', () => {
		it('returns non-strings and the empty string unchanged', () => {
			// Call sites build these from props; an undefined apiBase should
			// surface as its own error, not as the string "/index.phpundefined".
			expect(prefixUrl('')).toBe('')
			expect(prefixUrl(undefined)).toBeUndefined()
			expect(prefixUrl(null)).toBeNull()
		})
	})
})
