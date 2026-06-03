/**
 * Tests for cnRenderMarkdown.
 *
 * Covers REQ-MWPT (manifest-wiki-page-type) — wraps `marked.parse()`
 * with a defensive shim that returns `''` for null / non-string input.
 */

import { cnRenderMarkdown } from '@/composables/cnRenderMarkdown.js'

describe('cnRenderMarkdown', () => {
	it('parses an H1 heading', () => {
		const html = cnRenderMarkdown('# Hello')
		expect(html).toContain('<h1>Hello</h1>')
	})

	it('parses a paragraph', () => {
		const html = cnRenderMarkdown('Just a paragraph.')
		expect(html).toContain('<p>Just a paragraph.</p>')
	})

	it('parses an unordered list', () => {
		const html = cnRenderMarkdown('- one\n- two\n- three')
		expect(html).toContain('<ul>')
		expect(html).toContain('<li>one</li>')
		expect(html).toContain('<li>three</li>')
	})

	it('parses GFM tables', () => {
		const html = cnRenderMarkdown('| a | b |\n| - | - |\n| 1 | 2 |')
		expect(html).toContain('<table>')
		expect(html).toContain('<th>a</th>')
		expect(html).toContain('<td>1</td>')
	})

	it('parses fenced code blocks', () => {
		const html = cnRenderMarkdown('```\nconst x = 1;\n```')
		expect(html).toContain('<pre>')
		expect(html).toContain('const x = 1;')
	})

	it('does NOT convert single line breaks to <br> (breaks: false)', () => {
		const html = cnRenderMarkdown('line one\nline two')
		// `breaks: false` wraps both lines in one <p> with the newline preserved
		// rather than a <br>. Markdown standard behaviour.
		expect(html).not.toContain('<br>')
	})

	it('returns empty string for null', () => {
		expect(cnRenderMarkdown(null)).toBe('')
	})

	it('returns empty string for undefined', () => {
		expect(cnRenderMarkdown(undefined)).toBe('')
	})

	it('returns empty string for non-string input', () => {
		expect(cnRenderMarkdown(42)).toBe('')
		expect(cnRenderMarkdown({})).toBe('')
		expect(cnRenderMarkdown([])).toBe('')
	})

	it('returns empty string for empty string', () => {
		expect(cnRenderMarkdown('')).toBe('')
	})
})
