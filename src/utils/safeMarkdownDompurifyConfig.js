/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * safeMarkdownDompurifyConfig — frozen DOMPurify config used everywhere
 * `@conduction/nextcloud-vue` renders untrusted markdown (GitHub issue bodies,
 * the live-preview pane in `SuggestFeatureModal`, etc.).
 *
 * Disallows: `<script>`, all `on*` event-handler attributes, `javascript:`
 * URLs, `<iframe>`, `<style>`. Anchors keep `href`, `target`, `rel`.
 *
 * The constant is `Object.freeze`d so consumers cannot mutate it at runtime.
 *
 * Spec: features-roadmap-component — Requirement "SAFE_MARKDOWN_DOMPURIFY_CONFIG"
 * (`openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md`).
 *
 * @module utils/safeMarkdownDompurifyConfig
 */

/**
 * Strict DOMPurify configuration for sanitizing user-generated markdown HTML.
 *
 * @type {Readonly<object>}
 */
export const SAFE_MARKDOWN_DOMPURIFY_CONFIG = Object.freeze({
	ALLOWED_TAGS: [
		'p',
		'br',
		'hr',
		'strong',
		'em',
		'del',
		'code',
		'pre',
		'h1',
		'h2',
		'h3',
		'h4',
		'h5',
		'h6',
		'ul',
		'ol',
		'li',
		'blockquote',
		'a',
		'img',
		'table',
		'thead',
		'tbody',
		'tr',
		'th',
		'td',
	],
	ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title'],
	ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
	FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'button'],
	// Strip every event-handler attribute (onclick, onerror, ...).
	FORBID_ATTR: [
		'onerror',
		'onload',
		'onclick',
		'onmouseover',
		'onfocus',
		'onblur',
		'onchange',
		'onsubmit',
		'onkeydown',
		'onkeyup',
		'onkeypress',
		'onmousedown',
		'onmouseup',
		'onmousemove',
		'onmouseout',
		'onmouseenter',
		'onmouseleave',
		'onabort',
		'onbeforeunload',
		'onunload',
		'onhashchange',
		'onpopstate',
	],
})
