/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * toastUiSanitizer — replacement for `@toast-ui/editor`'s built-in HTML
 * sanitizer, passed to the editor as its `customHTMLSanitizer` option.
 *
 * **Why this exists (security).** `@toast-ui/editor@3.2.2` — the latest
 * release; the package has been unmaintained since February 2023 — does not
 * import its declared `dompurify` dependency at runtime. It *inlines a copy
 * of DOMPurify 2.3.3* into `dist/toastui-editor.js` and `dist/esm/index.js`,
 * so every DOMPurify advisory fixed after 2.3.3 (GHSA-h8r8-wccr-v5f2
 * mutation-XSS, GHSA-cj63-jhhr-wcxv USE_PROFILES prototype pollution, and
 * the rest of the chain up to 3.4.13) applies to the WYSIWYG editor and its
 * preview pane. An npm `overrides` entry for `dompurify` cannot fix it —
 * bumping the nested package changes nothing, because nothing requires it.
 *
 * The editor's `customHTMLSanitizer` option *fully replaces* that inlined
 * copy (`sanitizer: customHTMLSanitizer || sanitizeHTML` in the editor's
 * renderer options), so routing sanitisation through this module is the
 * actual fix: the same sanitising contract, executed by the maintained
 * DOMPurify 3.x that the rest of the library already depends on.
 *
 * **Why not `SAFE_MARKDOWN_DOMPURIFY_CONFIG`.** That config is the strict
 * allowlist for rendering *untrusted* markdown into a read-only `v-html`
 * binding, and it drops the structural markup an editing surface needs
 * (`div`, `span`, `class`, task-list checkboxes). Reusing it here would
 * visually break the WYSIWYG pane. This module instead mirrors Toast UI's
 * own sanitising contract byte for byte — see `TOAST_UI_DOMPURIFY_CONFIG` —
 * and changes only *which* DOMPurify enforces it.
 *
 * @module utils/toastUiSanitizer
 */

import DOMPurify from 'dompurify'

/**
 * DOMPurify configuration mirroring `@toast-ui/editor`'s internal
 * `sanitizeHTML()`.
 *
 * Kept identical to upstream so swapping the sanitizer implementation is a
 * pure security change with no behavioural difference in the editor:
 *
 * - `ADD_ATTR` — anchor/link attributes Toast UI's `linkAttributes` option
 *   is allowed to emit.
 * - `FORBID_TAGS` — upstream's blocklist. Broader than DOMPurify's own
 *   defaults (which already drop `script` and every `on*` handler); the
 *   extra entries keep form controls and document-level tags out of editor
 *   content.
 *
 * `ADD_TAGS` is deliberately omitted: upstream seeds it from a whitelist
 * that only ever contains `iframe` / `embed`, and only when a plugin calls
 * `registerTagWhitelistIfPossible()`. This library registers no such plugin,
 * so the list is always empty here — and leaving it empty is the safer side
 * of that difference.
 *
 * @type {Readonly<object>}
 */
export const TOAST_UI_DOMPURIFY_CONFIG = Object.freeze({
	ADD_ATTR: ['rel', 'target', 'hreflang', 'type'],
	FORBID_TAGS: [
		'input',
		'script',
		'textarea',
		'form',
		'button',
		'select',
		'meta',
		'style',
		'link',
		'title',
		'object',
		'base',
	],
})

/**
 * Sanitise an HTML string for `@toast-ui/editor`.
 *
 * Matches the `Sanitizer` signature the editor expects —
 * `(content: string) => string` — so it can be handed straight to the
 * `customHTMLSanitizer` option.
 *
 * @param {string} html Untrusted HTML produced by the editor's renderer.
 * @return {string} Sanitised HTML, or `''` for non-string input.
 */
export function toastUiSanitizer(html) {
	if (typeof html !== 'string' || html.length === 0) {
		return ''
	}
	return DOMPurify.sanitize(html, TOAST_UI_DOMPURIFY_CONFIG)
}
