/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for SAFE_MARKDOWN_DOMPURIFY_CONFIG — the frozen DOMPurify config used by
 * CnRoadmapItem + CnSuggestFeatureModal to sanitize untrusted GitHub-flavored
 * markdown HTML before binding via v-html.
 *
 * The XSS-vector suite is the load-bearing assertion for the entire markdown
 * rendering path. If one of these tests starts allowing a tag/attribute through,
 * we've regressed the strict allowlist.
 *
 * @spec openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md
 *       (requirement "SAFE_MARKDOWN_DOMPURIFY_CONFIG", scenario "XSS vectors stripped")
 */

import DOMPurify from 'dompurify'

import { SAFE_MARKDOWN_DOMPURIFY_CONFIG } from '../../src/utils/safeMarkdownDompurifyConfig.js'

const sanitize = (input) => DOMPurify.sanitize(input, SAFE_MARKDOWN_DOMPURIFY_CONFIG)

describe('SAFE_MARKDOWN_DOMPURIFY_CONFIG', () => {
	describe('frozen contract', () => {
		it('is a frozen object', () => {
			expect(Object.isFrozen(SAFE_MARKDOWN_DOMPURIFY_CONFIG)).toBe(true)
		})

		it('exposes the documented allowed tags', () => {
			expect(SAFE_MARKDOWN_DOMPURIFY_CONFIG.ALLOWED_TAGS).toContain('p')
			expect(SAFE_MARKDOWN_DOMPURIFY_CONFIG.ALLOWED_TAGS).toContain('strong')
			expect(SAFE_MARKDOWN_DOMPURIFY_CONFIG.ALLOWED_TAGS).toContain('code')
			expect(SAFE_MARKDOWN_DOMPURIFY_CONFIG.ALLOWED_TAGS).toContain('a')
		})

		it('forbids dangerous tags', () => {
			expect(SAFE_MARKDOWN_DOMPURIFY_CONFIG.FORBID_TAGS).toContain('script')
			expect(SAFE_MARKDOWN_DOMPURIFY_CONFIG.FORBID_TAGS).toContain('iframe')
			expect(SAFE_MARKDOWN_DOMPURIFY_CONFIG.FORBID_TAGS).toContain('style')
			expect(SAFE_MARKDOWN_DOMPURIFY_CONFIG.FORBID_TAGS).toContain('object')
			expect(SAFE_MARKDOWN_DOMPURIFY_CONFIG.FORBID_TAGS).toContain('embed')
		})

		it('forbids event-handler attributes', () => {
			expect(SAFE_MARKDOWN_DOMPURIFY_CONFIG.FORBID_ATTR).toContain('onerror')
			expect(SAFE_MARKDOWN_DOMPURIFY_CONFIG.FORBID_ATTR).toContain('onclick')
			expect(SAFE_MARKDOWN_DOMPURIFY_CONFIG.FORBID_ATTR).toContain('onload')
		})
	})

	describe('script-tag stripping', () => {
		it('removes a bare <script> tag entirely', () => {
			const output = sanitize('<script>alert(1)</script>')
			expect(output).not.toContain('<script')
			expect(output).not.toContain('alert(1)')
		})

		it('removes <script> embedded inside otherwise-safe content', () => {
			const output = sanitize('<p>before<script>alert(2)</script>after</p>')
			expect(output).not.toContain('<script')
			expect(output).toContain('before')
			expect(output).toContain('after')
		})

		it('removes <script type="text/javascript">', () => {
			const output = sanitize('<script type="text/javascript">window.location="evil"</script>')
			expect(output).not.toContain('<script')
			expect(output).not.toMatch(/window\.location/)
		})
	})

	describe('event-handler attribute stripping', () => {
		it('strips onerror from <img>', () => {
			const output = sanitize('<img src="x" onerror="alert(1)">')
			// img tag survives (it's allowed); onerror is stripped.
			expect(output).not.toContain('onerror')
			expect(output).not.toContain('alert(1)')
		})

		it('strips onclick from <a>', () => {
			const output = sanitize('<a href="https://example.org" onclick="steal()">link</a>')
			expect(output).not.toContain('onclick')
			expect(output).not.toContain('steal')
			expect(output).toContain('href="https://example.org"')
		})

		it('strips onload from <body> (which is itself stripped — defense in depth)', () => {
			const output = sanitize('<body onload="alert(1)">content</body>')
			expect(output).not.toContain('onload')
			expect(output).not.toContain('alert(1)')
		})

		it('strips onmouseover from <div>', () => {
			const output = sanitize('<div onmouseover="alert(1)">hover</div>')
			expect(output).not.toContain('onmouseover')
		})
	})

	describe('javascript: URL stripping', () => {
		it('strips javascript: from anchor href', () => {
			const output = sanitize('<a href="javascript:alert(1)">link</a>')
			expect(output).not.toContain('javascript:')
			expect(output).not.toContain('alert(1)')
		})

		it('strips javascript: from image src', () => {
			const output = sanitize('<img src="javascript:alert(1)">')
			expect(output).not.toContain('javascript:')
		})

		it('preserves https:// links untouched', () => {
			const output = sanitize('<a href="https://example.org">safe</a>')
			expect(output).toContain('href="https://example.org"')
			expect(output).toContain('safe')
		})
	})

	describe('<iframe> stripping', () => {
		it('removes <iframe> entirely', () => {
			const output = sanitize('<iframe src="https://evil.example.com"></iframe>')
			expect(output).not.toContain('<iframe')
			expect(output).not.toContain('evil.example.com')
		})

		it('removes <iframe> mid-content', () => {
			const output = sanitize('<p>safe<iframe src="evil"></iframe>still safe</p>')
			expect(output).not.toContain('<iframe')
		})
	})

	describe('<style> stripping', () => {
		it('removes <style> blocks', () => {
			const output = sanitize('<style>body { display: none }</style><p>content</p>')
			expect(output).not.toContain('<style')
			expect(output).not.toContain('display: none')
			expect(output).toContain('<p>')
			expect(output).toContain('content')
		})
	})

	describe('happy paths — markdown HTML survives', () => {
		it('preserves <strong>, <em>, <code>', () => {
			const output = sanitize('<p><strong>bold</strong> <em>italic</em> <code>code</code></p>')
			expect(output).toContain('<strong>bold</strong>')
			expect(output).toContain('<em>italic</em>')
			expect(output).toContain('<code>code</code>')
		})

		it('preserves headings, lists, blockquotes', () => {
			const output = sanitize('<h2>Title</h2><ul><li>a</li><li>b</li></ul><blockquote>quote</blockquote>')
			expect(output).toContain('<h2>Title</h2>')
			expect(output).toContain('<li>a</li>')
			expect(output).toContain('<blockquote>')
		})

		it('preserves <pre><code> fenced blocks', () => {
			const output = sanitize('<pre><code>const x = 1\n</code></pre>')
			expect(output).toContain('<pre>')
			expect(output).toContain('<code>')
			expect(output).toContain('const x = 1')
		})

		it('preserves tables', () => {
			const output = sanitize('<table><thead><tr><th>h1</th></tr></thead><tbody><tr><td>c1</td></tr></tbody></table>')
			expect(output).toContain('<table>')
			expect(output).toContain('<th>h1</th>')
			expect(output).toContain('<td>c1</td>')
		})
	})

	describe('combined attack vectors', () => {
		it('strips all unsafe parts from a multi-vector payload', () => {
			const input = '<script>alert(1)</script>'
				+ '<a href="javascript:alert(2)" onclick="alert(3)">x</a>'
				+ '<iframe src="evil"></iframe>'
				+ '<img src="x" onerror="alert(4)">'
				+ '<style>body{display:none}</style>'
				+ '<p>visible content</p>'
			const output = sanitize(input)

			expect(output).not.toContain('<script')
			expect(output).not.toContain('<iframe')
			expect(output).not.toContain('<style')
			expect(output).not.toContain('javascript:')
			expect(output).not.toContain('onclick')
			expect(output).not.toContain('onerror')
			expect(output).not.toContain('alert(1)')
			expect(output).not.toContain('alert(2)')
			expect(output).not.toContain('alert(3)')
			expect(output).not.toContain('alert(4)')
			expect(output).toContain('visible content')
		})
	})
})
