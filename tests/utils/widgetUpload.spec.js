/**
 * Tests for widgetUpload — the shared upload helpers extracted from
 * CnHeaderWidgetForm / CnImageWidgetForm (transport-URL validation, data-URL
 * reading, the size-capped embed fallback, and the once-per-type deprecation
 * warning).
 */

import {
	FALLBACK_MAX_BYTES,
	extractTransportUrl,
	readFileAsDataUrl,
	embedAsDataUrl,
	warnUploadFnDeprecated,
} from '@/utils/widgetUpload.js'

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text) => text,
}))

describe('extractTransportUrl', () => {
	it('returns the URL from a valid { url } response', () => {
		expect(extractTransportUrl({ url: 'https://example.test/a.png' }))
			.toBe('https://example.test/a.png')
	})

	it('accepts a relative resource path', () => {
		expect(extractTransportUrl({ url: '/apps/launchpad/resource/x.png' }))
			.toBe('/apps/launchpad/resource/x.png')
	})

	it('throws when the response has no URL', () => {
		expect(() => extractTransportUrl(null)).toThrow('no URL')
		expect(() => extractTransportUrl({})).toThrow('no URL')
		expect(() => extractTransportUrl({ url: '' })).toThrow('no URL')
	})

	it('throws on a dangerous scheme', () => {
		expect(() => extractTransportUrl({ url: 'javascript:alert(1)' }))
			.toThrow('unsafe URL')
	})
})

describe('readFileAsDataUrl', () => {
	it('resolves a file to a base64 data URL', async () => {
		const file = new File(['hello'], 'a.txt', { type: 'text/plain' })
		const dataUrl = await readFileAsDataUrl(file)
		expect(dataUrl).toMatch(/^data:text\/plain;base64,/)
	})
})

describe('embedAsDataUrl', () => {
	it('embeds a file at or under the size cap', async () => {
		const file = new File(['hello'], 'a.txt', { type: 'text/plain' })
		Object.defineProperty(file, 'size', { value: FALLBACK_MAX_BYTES })
		await expect(embedAsDataUrl(file)).resolves.toMatch(/^data:/)
	})

	it('rejects a file larger than the size cap', async () => {
		const file = new File(['hello'], 'a.txt', { type: 'text/plain' })
		Object.defineProperty(file, 'size', { value: FALLBACK_MAX_BYTES + 1 })
		await expect(embedAsDataUrl(file)).rejects.toThrow('too large')
	})
})

describe('warnUploadFnDeprecated', () => {
	it('warns at most once per component name', () => {
		const spy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		try {
			warnUploadFnDeprecated('CnFooForm')
			warnUploadFnDeprecated('CnFooForm')
			warnUploadFnDeprecated('CnBarForm')
			const fooCalls = spy.mock.calls.filter((c) => String(c[0]).includes('CnFooForm'))
			const barCalls = spy.mock.calls.filter((c) => String(c[0]).includes('CnBarForm'))
			expect(fooCalls).toHaveLength(1)
			expect(barCalls).toHaveLength(1)
		} finally {
			spy.mockRestore()
		}
	})
})
