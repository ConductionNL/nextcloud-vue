/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * libraryStyle: the library's stylesheet, once per page, the newest build wins.
 *
 * A Nextcloud page runs several apps' builds of this library at once: the
 * dashboard and launchpad load every app's widgets, and some apps load a
 * script on every page. Each of those bundles used to inject the whole
 * stylesheet, so one page could hold eight copies of different ages, and an
 * old copy overrode a newer one rule by rule. The published ESM entry calls
 * {@link installLibraryStyle} instead (see rollup.config.js): it keeps ONE
 * `<style data-cn-library>` and replaces it only with a newer build.
 *
 * The function is written without imports or closures: the build serialises
 * it (`Function.prototype.toString`) into `dist/esm/library-style.js`.
 *
 * @module utils/libraryStyle
 */

/**
 * Put the library stylesheet on the page unless a newer build already did.
 *
 * Builds are ordered by their build time (an ISO string, compared as text):
 * the published version is written into package.json after the build, so the
 * build time is the order that is known when the stylesheet is made.
 *
 * @param {string} css The stylesheet.
 * @param {string} built The build time, ISO 8601.
 * @param {Document} [doc] The document (defaults to the global one).
 * @return {'added'|'replaced'|'kept'|'none'} What happened.
 */
export function installLibraryStyle(css, built, doc) {
	const target = doc || (typeof document !== 'undefined' ? document : null)
	if (!target || typeof css !== 'string' || css === '') {
		return 'none'
	}
	const existing = target.querySelector('style[data-cn-library]')
	if (existing) {
		const current = existing.getAttribute('data-cn-library') || ''
		if (current >= String(built)) {
			return 'kept'
		}
		existing.textContent = css
		existing.setAttribute('data-cn-library', String(built))
		return 'replaced'
	}
	const style = target.createElement('style')
	style.setAttribute('data-cn-library', String(built))
	style.textContent = css
	// Appended, where style-loader used to put each copy, so the cascade
	// against Nextcloud's own stylesheets is what it was.
	const head = target.head || target.getElementsByTagName('head')[0] || target.documentElement
	head.appendChild(style)
	return 'added'
}
