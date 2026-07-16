/**
 * Tests for resolveImageUrl — display-time resolution of image URLs.
 */

import { resolveImageUrl } from '@/utils/resolveImageUrl.js'

jest.mock('@nextcloud/router', () => ({
	generateUrl: (path) => `/index.php${path}`,
}))

describe('resolveImageUrl', () => {
	it('resolves app-relative resource paths through generateUrl', () => {
		expect(resolveImageUrl('/apps/launchpad/resource/resource_x.gif'))
			.toBe('/index.php/apps/launchpad/resource/resource_x.gif')
	})

	it('leaves absolute http(s) URLs untouched', () => {
		expect(resolveImageUrl('https://example.test/a.png')).toBe('https://example.test/a.png')
		expect(resolveImageUrl('http://example.test/a.png')).toBe('http://example.test/a.png')
	})

	it('leaves protocol-relative, data and blob URLs untouched', () => {
		expect(resolveImageUrl('//cdn.test/a.png')).toBe('//cdn.test/a.png')
		expect(resolveImageUrl('data:image/png;base64,xxx')).toBe('data:image/png;base64,xxx')
		expect(resolveImageUrl('blob:abc-123')).toBe('blob:abc-123')
	})

	it('does not double-prefix an already-resolved /index.php path', () => {
		expect(resolveImageUrl('/index.php/apps/launchpad/resource/x.gif'))
			.toBe('/index.php/apps/launchpad/resource/x.gif')
	})

	it('returns non-strings and empty values unchanged', () => {
		expect(resolveImageUrl('')).toBe('')
		expect(resolveImageUrl(null)).toBe(null)
		expect(resolveImageUrl(undefined)).toBe(undefined)
	})
})
