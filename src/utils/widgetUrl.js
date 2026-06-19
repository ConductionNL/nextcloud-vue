/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * widgetUrl — shared, pure client-side URL validation / sanitisation and
 * icon-source helpers used by the content/config dashboard widgets
 * (cn-widget-library, Wave 1). Ported from the launchpad `useUrlSanitiser`
 * composable + `dashboardIcons.isCustomIconUrl` helper so the migrated
 * `CnLinkButtonWidget` and `CnQuicklinksWidget` carry their original
 * defence-in-depth behaviour without depending on the launchpad app.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */

/** Maximum URL length the widgets will accept. */
export const MAX_URL_LENGTH = 2048

/**
 * URL schemes the widgets explicitly refuse (XSS / local-file vectors).
 *
 * @type {readonly string[]}
 */
export const DANGEROUS_SCHEMES = Object.freeze([
	'javascript:',
	'data:',
	'vbscript:',
	'file:',
])

/**
 * URL schemes the widgets accept in addition to the relative-path prefix.
 *
 * @type {readonly string[]}
 */
export const ALLOWED_SCHEMES = Object.freeze([
	'http://',
	'https://',
	'mailto:',
	'tel:',
])

/**
 * Strip whitespace and reject dangerous schemes. Returns the trimmed URL
 * when it is safe, or an empty string when the scheme is dangerous (so the
 * caller can drop the value rather than store an XSS vector).
 *
 * @param {*} url the raw input value (typically a string from a form field).
 * @return {string} the sanitised URL, or `''` when unsafe / non-string.
 */
export function sanitiseUrl(url) {
	if (typeof url !== 'string') {
		return ''
	}
	const trimmed = url.trim()
	if (trimmed === '') {
		return ''
	}
	const lowered = trimmed.toLowerCase()
	for (const scheme of DANGEROUS_SCHEMES) {
		if (lowered.startsWith(scheme)) {
			return ''
		}
	}
	return trimmed
}

/**
 * Test whether a URL would be accepted by a widget form: non-empty, ≤
 * {@link MAX_URL_LENGTH} chars, and starting with `http://`, `https://`,
 * `mailto:`, `tel:`, or `/` (relative Nextcloud path); never a dangerous
 * scheme.
 *
 * @param {*} url the candidate URL.
 * @return {boolean} `true` when the URL passes every rule.
 */
export function validateUrl(url) {
	if (typeof url !== 'string') {
		return false
	}
	const trimmed = url.trim()
	if (trimmed === '' || trimmed.length > MAX_URL_LENGTH) {
		return false
	}
	const lowered = trimmed.toLowerCase()
	for (const scheme of DANGEROUS_SCHEMES) {
		if (lowered.startsWith(scheme)) {
			return false
		}
	}
	if (trimmed.startsWith('/')) {
		return true
	}
	for (const scheme of ALLOWED_SCHEMES) {
		if (lowered.startsWith(scheme)) {
			return true
		}
	}
	return false
}

/**
 * Whether a URL would open in a new tab by default (external http/https
 * schemes) when a link's explicit `openInNewTab` field is not set.
 *
 * @param {*} url the candidate URL.
 * @return {boolean} `true` for an http/https URL.
 */
export function isExternalUrl(url) {
	if (typeof url !== 'string') {
		return false
	}
	const lowered = url.trim().toLowerCase()
	return lowered.startsWith('http://') || lowered.startsWith('https://')
}

/**
 * Whether an icon value names a custom image source (an uploaded file path
 * or a remote URL) rather than a bare MDI icon name. Custom sources render
 * as `<img>`; bare names render through `CnIcon`.
 *
 * @param {*} name the icon value from widget content.
 * @return {boolean} `true` when the value is a `/`- or `http`-prefixed source.
 */
export function isCustomIconUrl(name) {
	if (typeof name !== 'string' || name.length === 0) {
		return false
	}
	return name.startsWith('/') || name.startsWith('http')
}
