/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for safeHref and safeImageSrc — URL scheme validation utilities.
 *
 * Covers wave-12 regression vectors:
 *   WF1 — backslash-prefixed protocol-relative bypass (`\\evil.com/x`, `/\evil.com/x`)
 *   WF2 — leading-whitespace bypass (`' //evil.com'`, `'\t//evil.com'`)
 *
 * Also covers the original wave-9 baselines (javascript:, data:, `//`).
 */

import { safeHref, safeImageSrc } from '../../src/utils/safeHref.js'

describe('safeHref', () => {
	describe('safe inputs — returned unchanged', () => {
		it('returns an https: URL', () => {
			expect(safeHref('https://example.com/path')).toBe('https://example.com/path')
		})

		it('returns an http: URL', () => {
			expect(safeHref('http://example.com/path')).toBe('http://example.com/path')
		})

		it('returns a mailto: URL', () => {
			expect(safeHref('mailto:info@example.com')).toBe('mailto:info@example.com')
		})

		it('returns a root-relative path', () => {
			expect(safeHref('/apps/files')).toBe('/apps/files')
		})

		it('returns a deeper root-relative path', () => {
			expect(safeHref('/index.php/apps/talk/open')).toBe('/index.php/apps/talk/open')
		})
	})

	describe('wave-9 baselines — rejected (returns #)', () => {
		it('rejects javascript: scheme', () => {
			expect(safeHref('javascript:alert(1)')).toBe('#')
		})

		it('rejects data: scheme', () => {
			expect(safeHref('data:text/html,<h1>x</h1>')).toBe('#')
		})

		it('rejects vbscript: scheme', () => {
			expect(safeHref('vbscript:msgbox(1)')).toBe('#')
		})

		it('rejects a plain protocol-relative URL (//)', () => {
			expect(safeHref('//attacker.com/steal')).toBe('#')
		})

		it('rejects null', () => {
			expect(safeHref(null)).toBe('#')
		})

		it('rejects undefined', () => {
			expect(safeHref(undefined)).toBe('#')
		})

		it('rejects empty string', () => {
			expect(safeHref('')).toBe('#')
		})

		it('rejects a non-string value', () => {
			expect(safeHref(42)).toBe('#')
		})
	})

	describe('WF1 — backslash-prefixed protocol-relative bypass (wave-12 regression)', () => {
		it('rejects \\\\evil.com/x (double-backslash protocol-relative)', () => {
			// WHATWG URL normalises \\ → // for special-scheme bases, so
			// new URL('\\\\evil.com/x', origin).href === 'https://evil.com/x'.
			// The browser performs the same normalisation at navigation time.
			// safeHref normalises backslashes to slashes then applies the //
			// check — so '\\\\evil.com/x' → '//evil.com/x' → rejected.
			expect(safeHref('\\\\evil.com/x')).toBe('#')
		})

		it('rejects /\\evil.com/x (slash-backslash protocol-relative)', () => {
			// '/\evil.com/x' normalises to '//evil.com/x' → rejected as protocol-relative
			expect(safeHref('/\\evil.com/x')).toBe('#')
		})

		// Note: '\evil.com' normalises (backslash → slash) to '/evil.com' which is
		// a valid same-origin root-relative path — NOT a bypass — and is therefore
		// returned unchanged. This is correct: the WHATWG URL parser treats a single
		// leading slash as root-relative, so the destination is the same NC origin.
	})

	describe('WF2 — leading-whitespace bypass (wave-12 regression)', () => {
		it('rejects " //evil.com" (space-prefixed protocol-relative)', () => {
			// The HTML spec strips leading whitespace when assigning to href,
			// so the browser navigates to //evil.com at click time.
			expect(safeHref(' //evil.com')).toBe('#')
		})

		it('rejects "\\t//evil.com" (tab-prefixed protocol-relative)', () => {
			expect(safeHref('\t//evil.com')).toBe('#')
		})

		it('rejects "\\rjavascript:alert(1)" (CR-prefixed javascript:)', () => {
			expect(safeHref('\rjavascript:alert(1)')).toBe('#')
		})

		it('rejects "\\tjavascript:alert(1)" (tab-prefixed javascript:)', () => {
			expect(safeHref('\tjavascript:alert(1)')).toBe('#')
		})

		it('rejects a newline-prefixed protocol-relative URL', () => {
			expect(safeHref('\n//evil.com')).toBe('#')
		})
	})
})

describe('safeImageSrc', () => {
	describe('safe inputs — returned unchanged', () => {
		it('returns an https: image URL', () => {
			expect(safeImageSrc('https://example.com/logo.png')).toBe('https://example.com/logo.png')
		})

		it('returns an http: image URL', () => {
			expect(safeImageSrc('http://example.com/logo.png')).toBe('http://example.com/logo.png')
		})

		it('returns a safe data:image/png URI', () => {
			const dataUri = 'data:image/png;base64,iVBORw0KGgo='
			expect(safeImageSrc(dataUri)).toBe(dataUri)
		})

		it('returns a safe data:image/jpeg URI', () => {
			expect(safeImageSrc('data:image/jpeg;base64,/9j/4AAQ=')).toBe('data:image/jpeg;base64,/9j/4AAQ=')
		})

		it('returns a safe data:image/webp URI', () => {
			expect(safeImageSrc('data:image/webp;base64,UklGRg==')).toBe('data:image/webp;base64,UklGRg==')
		})
	})

	describe('wave-9 baselines — rejected (returns empty string)', () => {
		it('rejects javascript: scheme', () => {
			expect(safeImageSrc('javascript:alert(1)')).toBe('')
		})

		it('rejects data:text/html', () => {
			expect(safeImageSrc('data:text/html,<script>alert(1)</script>')).toBe('')
		})

		it('rejects protocol-relative URL', () => {
			expect(safeImageSrc('//attacker.com/pixel.png')).toBe('')
		})

		it('rejects null', () => {
			expect(safeImageSrc(null)).toBe('')
		})

		it('rejects undefined', () => {
			expect(safeImageSrc(undefined)).toBe('')
		})
	})

	describe('WF1/WF2 — same bypass class as safeHref (wave-12 regression)', () => {
		it('rejects \\\\evil.com/pixel.png', () => {
			expect(safeImageSrc('\\\\evil.com/pixel.png')).toBe('')
		})

		it('rejects /\\evil.com/pixel.png', () => {
			expect(safeImageSrc('/\\evil.com/pixel.png')).toBe('')
		})

		it('rejects " //evil.com/pixel.png" (leading space)', () => {
			expect(safeImageSrc(' //evil.com/pixel.png')).toBe('')
		})

		it('rejects "\\t//evil.com/pixel.png" (leading tab)', () => {
			expect(safeImageSrc('\t//evil.com/pixel.png')).toBe('')
		})
	})
})
