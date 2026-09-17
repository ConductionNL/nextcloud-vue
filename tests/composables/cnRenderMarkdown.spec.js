/**
 * Tests for cnRenderMarkdown.
 *
 * Covers REQ-MWPT (manifest-wiki-page-type) — wraps `marked.parse()`
 * with a defensive shim that returns `''` for null / non-string input,
 * and passes all output through DOMPurify to prevent XSS.
 */

import { version as markedVersion } from 'marked/package.json'
import { cnRenderMarkdown } from '@/composables/cnRenderMarkdown.js'

// The peer range allows marked 12 up to 18, and the apps install either end
// (opencatalogi 12, most of the fleet 18). This document crosses the block
// types whose tokenizers changed between those majors (blank-line trimming in
// 18, list tokens in 17, renderer tokens in 13), so one exact string pins the
// HTML on both ends. Run it on the other end with
// `npm install --no-save marked@12 && npx jest tests/composables/cnRenderMarkdown.spec.js`,
// then `npm ci`.
const PEER_RANGE_DOCUMENT = '# Title\n\nSome **bold** text.\n\n\n- one\n- two\n\n'
	+ '| a | b |\n| - | - |\n| 1 | 2 |\n\n\n```\nconst x = 1\n```\n\n\n> quote\n\n---\n\nend'
const PEER_RANGE_HTML = '<h1>Title</h1>\n<p>Some <strong>bold</strong> text.</p>\n'
	+ '<ul>\n<li>one</li>\n<li>two</li>\n</ul>\n'
	+ '<table>\n<thead>\n<tr>\n<th>a</th>\n<th>b</th>\n</tr>\n</thead>\n'
	+ '<tbody><tr>\n<td>1</td>\n<td>2</td>\n</tr>\n</tbody></table>\n'
	+ '<pre><code>const x = 1\n</code></pre>\n'
	+ '<blockquote>\n<p>quote</p>\n</blockquote>\n<hr>\n<p>end</p>\n'

describe(`cnRenderMarkdown on marked ${markedVersion}`, () => {
	it('returns a string synchronously, not a promise', () => {
		// marked 14 made the return type follow the `async` option. The
		// instance leaves it unset, so a `v-html` binding gets a string.
		expect(typeof cnRenderMarkdown('# Hello')).toBe('string')
	})

	it('renders the same HTML on every marked major the peer range allows', () => {
		expect(cnRenderMarkdown(PEER_RANGE_DOCUMENT)).toBe(PEER_RANGE_HTML)
	})
})

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

	// ── XSS / DOMPurify sanitisation ──────────────────────────────────────

	it('strips onerror event handler from img tag (XSS #460)', () => {
		// A user pasting this into a CnMarkdownEditor preview pane must NOT
		// produce an executable onerror attribute in the rendered HTML.
		const html = cnRenderMarkdown('<img src=x onerror=alert(document.cookie)>')
		expect(html).not.toContain('onerror')
		expect(html).not.toContain('alert')
	})

	it('strips javascript: href (XSS)', () => {
		const html = cnRenderMarkdown('[click](javascript:alert(1))')
		expect(html).not.toContain('javascript:')
	})

	it('strips script tags (XSS)', () => {
		const html = cnRenderMarkdown('<script>alert(1)</script>')
		expect(html).not.toContain('<script>')
		expect(html).not.toContain('alert(1)')
	})

	it('preserves safe inline elements after sanitisation', () => {
		const html = cnRenderMarkdown('**bold** and _italic_')
		expect(html).toContain('<strong>bold</strong>')
		expect(html).toContain('<em>italic</em>')
	})
})
