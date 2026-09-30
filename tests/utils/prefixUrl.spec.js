/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `prefixUrl()` is applied at hundreds of call sites across the component
 * fleet (WOO-560), so it has to be INERT on everything that is not an
 * app-absolute path, and idempotent on a path it already prefixed.
 *
 * The prefix itself comes from `@nextcloud/router`'s `generateUrl()`: the
 * instance webroot, plus `/index.php` unless Nextcloud reports working URL
 * rewriting. Only the prefix is taken from it, so `{placeholders}` in the path
 * are never URL-encoded.
 */
const { prefixUrl } = require('../../src/utils/headers.js')

/**
 * Describe the instance the way Nextcloud does on every page.
 *
 * @param {object} opts Instance shape.
 * @param {boolean} opts.rewrite Whether URL rewriting works (pretty URLs).
 * @param {string} [opts.webroot] The webroot, '' at the domain root.
 */
function instance({ rewrite, webroot = '' }) {
	window.OC.config.modRewriteWorking = rewrite
	window._oc_webroot = webroot
}

describe('prefixUrl', () => {
	afterEach(() => {
		instance({ rewrite: true })
	})

	describe('on an instance WITHOUT pretty URLs', () => {
		beforeEach(() => {
			instance({ rewrite: false })
		})

		it('prefixes an app-relative API path with /index.php', () => {
			expect(prefixUrl('/apps/openregister/api/objects'))
				.toBe('/index.php/apps/openregister/api/objects')
		})

		it('is idempotent — a path that already carries the prefix is returned unchanged', () => {
			const already = '/index.php/apps/openregister/api/objects'
			expect(prefixUrl(already)).toBe(already)
			expect(prefixUrl(prefixUrl('/apps/openregister/api/objects')))
				.toBe('/index.php/apps/openregister/api/objects')
		})

		it('never puts /index.php in front of OCS or WebDAV', () => {
			expect(prefixUrl('/ocs/v2.php/cloud/users/details')).toBe('/ocs/v2.php/cloud/users/details')
			expect(prefixUrl('/remote.php/dav/files/admin')).toBe('/remote.php/dav/files/admin')
		})

		it('leaves {placeholders} and JSON query values unencoded', () => {
			expect(prefixUrl('/apps/openregister/api/credentials/{id}/session-request'))
				.toBe('/index.php/apps/openregister/api/credentials/{id}/session-request')
			expect(prefixUrl('/apps/x/api?_filter={"a":1}'))
				.toBe('/index.php/apps/x/api?_filter={"a":1}')
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
			expect(prefixUrl('api/objects')).toBe('api/objects')
			expect(prefixUrl('./api/objects')).toBe('./api/objects')
			expect(prefixUrl('../api/objects')).toBe('../api/objects')
		})
	})

	describe('on an instance WITH pretty URLs', () => {
		it('returns an app-relative path untouched', () => {
			instance({ rewrite: true })
			expect(prefixUrl('/apps/openregister/api/objects'))
				.toBe('/apps/openregister/api/objects')
		})

		it('still returns an explicitly prefixed path untouched', () => {
			instance({ rewrite: true })
			expect(prefixUrl('/index.php/apps/openregister/api/objects'))
				.toBe('/index.php/apps/openregister/api/objects')
		})
	})

	describe('in a subdirectory webroot', () => {
		it('adds the webroot, and /index.php without rewriting', () => {
			instance({ rewrite: false, webroot: '/nextcloud' })
			expect(prefixUrl('/apps/openregister/api/objects'))
				.toBe('/nextcloud/index.php/apps/openregister/api/objects')
			expect(prefixUrl('/ocs/v2.php/cloud/capabilities'))
				.toBe('/nextcloud/ocs/v2.php/cloud/capabilities')
		})

		it('is idempotent on a path that already carries the webroot', () => {
			instance({ rewrite: false, webroot: '/nextcloud' })
			const once = prefixUrl('/apps/openregister/api/objects')
			expect(prefixUrl(once)).toBe(once)
		})
	})

	describe('degenerate input', () => {
		it('returns non-strings and the empty string unchanged', () => {
			expect(prefixUrl('')).toBe('')
			expect(prefixUrl(undefined)).toBeUndefined()
			expect(prefixUrl(null)).toBeNull()
		})
	})
})
