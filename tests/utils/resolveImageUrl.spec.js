/**
 * Tests for resolveImageUrl — display-time resolution of image URLs.
 */

import { resolveImageUrl } from '@/utils/resolveImageUrl.js'

jest.mock('@nextcloud/router', () => ({
	generateUrl: (path) => `/index.php${path}`,
	imagePath: jest.fn(() => 'resolved-by-imagePath'),
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

	it('leaves a webrooted or leading-slash-less apps path untouched (contract requires leading-slash /apps/)', () => {
		expect(resolveImageUrl('/nextcloud/apps/launchpad/resource/x.gif'))
			.toBe('/nextcloud/apps/launchpad/resource/x.gif')
		expect(resolveImageUrl('apps/launchpad/resource/x.gif'))
			.toBe('apps/launchpad/resource/x.gif')
	})

	// Where the app's img/ folder lives depends on the install, which is
	// imagePath()'s business, so this only checks what it is asked for.
	it('hands an app image reference to imagePath and returns its answer', () => {
		const { imagePath } = jest.requireMock('@nextcloud/router')
		expect(resolveImageUrl('app:pipelinq/marketing/hero.svg')).toBe('resolved-by-imagePath')
		expect(imagePath).toHaveBeenCalledWith('pipelinq', 'marketing/hero.svg')
	})

	it('leaves a malformed app reference untouched', () => {
		expect(resolveImageUrl('app:pipelinq')).toBe('app:pipelinq')
		expect(resolveImageUrl('app:/hero.svg')).toBe('app:/hero.svg')
	})

	it('returns non-strings and empty values unchanged', () => {
		expect(resolveImageUrl('')).toBe('')
		expect(resolveImageUrl(null)).toBe(null)
		expect(resolveImageUrl(undefined)).toBe(undefined)
	})
})
