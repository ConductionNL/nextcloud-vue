/**
 * Tests for toastUiSanitizer.
 *
 * The module exists to keep `@toast-ui/editor`'s inlined DOMPurify 2.3.3 out
 * of the sanitising path (the package is unmaintained, so no npm-level fix is
 * available). These tests pin both halves of that contract: dangerous markup
 * is stripped, and the structural markup an editing surface needs survives —
 * the latter being what makes this safe to hand to `customHTMLSanitizer`
 * instead of the strict read-only markdown config.
 */

import { TOAST_UI_DOMPURIFY_CONFIG, toastUiSanitizer } from '@/utils/toastUiSanitizer.js'

describe('toastUiSanitizer', () => {
	describe('strips dangerous markup', () => {
		it('removes script tags', () => {
			const out = toastUiSanitizer('<p>hi</p><script>alert(1)</script>')
			expect(out).not.toContain('script')
			expect(out).toContain('<p>hi</p>')
		})

		it('removes event-handler attributes', () => {
			const out = toastUiSanitizer('<img src="x" onerror="alert(1)">')
			expect(out).not.toContain('onerror')
		})

		it('removes javascript: URLs', () => {
			const out = toastUiSanitizer('<a href="javascript:alert(1)">x</a>')
			expect(out).not.toContain('javascript:')
		})

		it.each(TOAST_UI_DOMPURIFY_CONFIG.FORBID_TAGS)('removes <%s>, matching upstream\'s blocklist', (tag) => {
			const out = toastUiSanitizer(`<p>keep</p><${tag}></${tag}>`)
			expect(out).not.toContain(`<${tag}`)
			expect(out).toContain('<p>keep</p>')
		})
	})

	describe('preserves editor markup', () => {
		it('keeps structural elements and their classes', () => {
			const out = toastUiSanitizer('<div class="wrap"><span class="tok">x</span></div>')
			expect(out).toContain('class="wrap"')
			expect(out).toContain('class="tok"')
		})

		it('keeps tables', () => {
			const out = toastUiSanitizer('<table><tbody><tr><td>a</td></tr></tbody></table>')
			expect(out).toContain('<td>a</td>')
		})

		it.each(TOAST_UI_DOMPURIFY_CONFIG.ADD_ATTR)('keeps the %s link attribute', (attr) => {
			const out = toastUiSanitizer(`<a href="https://example.com" ${attr}="noopener">x</a>`)
			expect(out).toContain(`${attr}="noopener"`)
		})
	})

	describe('input guards', () => {
		it.each([null, undefined, 42, {}, [], ''])('returns an empty string for %p', (input) => {
			expect(toastUiSanitizer(input)).toBe('')
		})
	})

	it('exposes a frozen config so consumers cannot loosen it at runtime', () => {
		expect(Object.isFrozen(TOAST_UI_DOMPURIFY_CONFIG)).toBe(true)
	})
})
