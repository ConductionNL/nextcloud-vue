/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
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
 * **Security:** The HTML produced by `marked.parse()` is sanitised with
 * DOMPurify before being returned. All consumers — including
 * `CnMarkdownEditor`'s live-preview `v-html` binding — are therefore
 * protected against stored XSS payloads (e.g. `<img onerror=...>`).
 * Never bypass this sanitisation step.
 *
 * Spec: REQ-MWPT (manifest-wiki-page-type).
 *
 * @module composables/cnRenderMarkdown
 */

import DOMPurify from 'dompurify'
import { Marked } from 'marked'
import { SAFE_MARKDOWN_DOMPURIFY_CONFIG } from '../utils/safeMarkdownDompurifyConfig.js'

/**
 * Per-module `Marked` instance so configuration is scoped to this
 * composable and does NOT mutate the global `marked` singleton (which
 * would affect any other code in the same application that imports
 * `marked` directly).
 */
const markedInstance = new Marked({
	gfm: true,
	breaks: false,
})

/**
 * Parse a markdown string into sanitised HTML.
 *
 * The pipeline is:
 *   1. `markedInstance.parse(text)` — converts Markdown to HTML.
 *   2. `DOMPurify.sanitize(html, SAFE_MARKDOWN_DOMPURIFY_CONFIG)` — strips
 *      `<script>`, `on*` event-handler attributes, `javascript:` URLs, and
 *      other dangerous constructs before the string reaches any `v-html`
 *      binding.
 *
 * Returns the empty string for any non-string input so a `v-html` binding
 * never blows up on an empty record.
 *
 * @param {string|null|undefined} text Markdown source.
 * @return {string} Sanitised HTML rendering of `text`, or `''` for null/non-string.
 *
 * @example
 *   cnRenderMarkdown('# Hello\n\nWorld')
 *   // -> '<h1>Hello</h1>\n<p>World</p>\n'
 *
 * @example
 *   cnRenderMarkdown(null) // -> ''
 *   cnRenderMarkdown({}) // -> ''
 *
 * @example
 *   // XSS payloads are stripped — onerror is not present in the output
 *   cnRenderMarkdown('<img src=x onerror=alert(1)>')
 *   // -> '<img src="x">'  (event handler removed by DOMPurify)
 */
export function cnRenderMarkdown(text) {
	if (typeof text !== 'string' || text.length === 0) {
		return ''
	}
	try {
		const raw = markedInstance.parse(text)
		return DOMPurify.sanitize(raw, SAFE_MARKDOWN_DOMPURIFY_CONFIG)
	} catch {
		// `marked` is generally safe; the catch is a belt-and-braces
		// guard so a malformed input (e.g. a corrupted code-fence) can
		// never blank the page. Empty string falls through to the
		// CnWikiPage empty-state.
		return ''
	}
}
