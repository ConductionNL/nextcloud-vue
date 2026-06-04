/**
 * cnRenderMarkdown — Thin wrapper around `marked.parse(...)` configured for
 * the manifest-driven `type: "wiki"` page surface.
 *
 * Centralising the configuration here gives every wiki / docs / help-page
 * consumer the same GitHub-flavoured markdown contract:
 *
 *   - `gfm: true`     — tables, strikethrough, task lists, fenced code.
 *   - `breaks: false` — single newlines stay as text; only blank-line
 *     separators introduce paragraphs. Authors editing in a plain
 *     textarea expect this; auto-converting `\n` to `<br>` produces
 *     odd spacing inside lists and indented blocks.
 *
 * The helper is defensive — null / undefined / non-string input returns
 * the empty string rather than letting `marked` throw. That keeps the
 * call site (a Vue computed `v-html` binding) simple.
 *
 * Spec: REQ-MWPT (manifest-wiki-page-type).
 *
 * @module composables/cnRenderMarkdown
 */

import { marked } from 'marked'

// One module-level call so the configuration is shared across every
// CnWikiPage mount. The renderer is otherwise stateless.
marked.setOptions({
	gfm: true,
	breaks: false,
})

/**
 * Parse a markdown string into HTML using the lib-wide markdown
 * configuration. Returns the empty string for any non-string input
 * so a `v-html` binding never blows up on an empty record.
 *
 * @param {string|null|undefined} text Markdown source.
 * @return {string} HTML rendering of `text`, or `''` for null/non-string.
 *
 * @example
 *   cnRenderMarkdown('# Hello\n\nWorld')
 *   // -> '<h1>Hello</h1>\n<p>World</p>\n'
 *
 * @example
 *   cnRenderMarkdown(null) // -> ''
 *   cnRenderMarkdown({}) // -> ''
 */
export function cnRenderMarkdown(text) {
	if (typeof text !== 'string' || text.length === 0) {
		return ''
	}
	try {
		return marked.parse(text)
	} catch {
		// `marked` is generally safe; the catch is a belt-and-braces
		// guard so a malformed input (e.g. a corrupted code-fence) can
		// never blank the page. Empty string falls through to the
		// CnWikiPage empty-state.
		return ''
	}
}
