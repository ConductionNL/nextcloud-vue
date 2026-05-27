/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * safeHref — URL scheme validation for `:href` bindings.
 *
 * Components that bind user-controlled URLs to `:href` attributes must
 * validate the scheme before rendering. Without this, a malicious data
 * source returning `javascript:alert(1)` or `data:text/html,...` as a
 * URL would execute code when the user clicks the link.
 *
 * This utility returns the original URL when the scheme is safe
 * (`https:`, `http:`, `mailto:`) or when the URL is a relative path
 * starting with `/`. It returns `'#'` for all other inputs including
 * `javascript:`, `data:`, `vbscript:`, and any other unrecognised scheme.
 *
 * @module utils/safeHref
 */

/**
 * Validate a URL and return it only if the scheme is safe for `:href`.
 *
 * Safe inputs:
 *   - `https://...` and `http://...` absolute URLs
 *   - `mailto:...` links
 *   - Relative paths starting with `/` (same-origin)
 *
 * Unsafe inputs (returns `'#'`):
 *   - `javascript:...`
 *   - `data:...`
 *   - `vbscript:...`
 *   - Any other unrecognised scheme
 *   - `null`, `undefined`, empty string
 *
 * @param {string|null|undefined} url The URL to validate.
 * @return {string} The original URL if safe, or `'#'` otherwise.
 *
 * @example
 *   safeHref('https://example.com')        // -> 'https://example.com'
 *   safeHref('/apps/files')                // -> '/apps/files'
 *   safeHref('mailto:info@example.com')    // -> 'mailto:info@example.com'
 *   safeHref('javascript:alert(1)')        // -> '#'
 *   safeHref('data:text/html,<h1>x</h1>') // -> '#'
 *   safeHref(null)                         // -> '#'
 */
export function safeHref(url) {
	if (!url || typeof url !== 'string') {
		return '#'
	}
	// Allow relative paths (same-origin navigation)
	if (url.startsWith('/')) {
		return url
	}
	try {
		const parsed = new URL(url, window.location.origin)
		if (['https:', 'http:', 'mailto:'].includes(parsed.protocol)) {
			return url
		}
	} catch {
		// URL constructor threw — not a valid absolute URL and not a
		// relative path either; treat as unsafe.
	}
	return '#'
}

/**
 * SVG path `d` attribute allowlist validator.
 *
 * Restricts a path string to the characters used by SVG path commands:
 * letters (commands), digits, decimal points, commas, whitespace, and
 * the minus sign. Rejects any string containing other characters (e.g.
 * embedded script, unicode trickery).
 *
 * Returns the empty string for invalid inputs so a `:d` binding receives
 * an inert value rather than an attacker-controlled string.
 *
 * @param {string|null|undefined} pathData The SVG path `d` value.
 * @return {string} The original string if valid, or `''` otherwise.
 *
 * @example
 *   safeSvgPath('M12 2 L20 20 Z')  // -> 'M12 2 L20 20 Z'
 *   safeSvgPath('M0,0<script>')     // -> ''
 */
export function safeSvgPath(pathData) {
	if (!pathData || typeof pathData !== 'string') {
		return ''
	}
	// Allowlist: SVG path command letters, digits, decimal points,
	// commas, whitespace, minus (for negative coordinates), and `e`/`E`
	// for scientific notation in arc radii.
	if (/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s\-eE]+$/.test(pathData)) {
		return pathData
	}
	return ''
}
