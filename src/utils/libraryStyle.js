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
 * The board-look rules come as their own sheet (`boardCss`), put right after
 * the library sheet as `<style data-cn-library-board>` by the same newest-wins
 * rule. It carries `media="not all"`, so it takes no part in style matching,
 * until a component resolves the board look and enableBoardLookStyle() sets
 * `data-cn-board-look` on `<html>`; a sheet installed after that is active at
 * once (src/utils/boardLookStyle.js).
 *
 * @param {string} css The stylesheet.
 * @param {string} built The build time, ISO 8601.
 * @param {Document} [doc] The document (defaults to the global one).
 * @param {string} [boardCss] The board-look rules, kept switched off until the board look is used.
 * @return {'added'|'replaced'|'kept'|'none'} What happened to the library sheet.
 * @spec openspec/changes/board-look-sheet-on-demand/specs/library-stylesheet/spec.md#requirement-the-board-look-rules-are-active-only-where-the-board-look-is-used
 */
export function installLibraryStyle(css, built, doc, boardCss) {
	const target = doc || (typeof document !== 'undefined' ? document : null)
	if (!target || typeof css !== 'string' || css === '') {
		return 'none'
	}
	let outcome = 'added'
	let style = target.querySelector('style[data-cn-library]')
	if (style) {
		const current = style.getAttribute('data-cn-library') || ''
		if (current >= String(built)) {
			outcome = 'kept'
		} else {
			style.textContent = css
			style.setAttribute('data-cn-library', String(built))
			outcome = 'replaced'
		}
	} else {
		style = target.createElement('style')
		style.setAttribute('data-cn-library', String(built))
		style.textContent = css
		// Appended, where style-loader used to put each copy, so the cascade
		// against Nextcloud's own stylesheets is what it was.
		const head = target.head || target.getElementsByTagName('head')[0] || target.documentElement
		head.appendChild(style)
	}
	if (typeof boardCss !== 'string' || boardCss === '') {
		return outcome
	}
	let board = target.querySelector('style[data-cn-library-board]')
	if (board && (board.getAttribute('data-cn-library-board') || '') >= String(built)) {
		return outcome
	}
	if (!board) {
		board = target.createElement('style')
		if (!target.documentElement.hasAttribute('data-cn-board-look')) {
			board.setAttribute('media', 'not all')
		}
	}
	board.setAttribute('data-cn-library-board', String(built))
	board.textContent = boardCss
	// Right after the library sheet: after the base rules it refines, before
	// the stylesheets apps add later.
	style.parentNode.insertBefore(board, style.nextSibling)
	return outcome
}

/**
 * Cut the board-look block (between the markers css/index.css puts around the
 * look-board files) out of the extracted stylesheet.
 *
 * @param {string} css The whole extracted stylesheet.
 * @return {{base: string, board: string}|null} The sheet without the block (a `cn-board-look-slot` comment in its place), and the block; null without the markers.
 * @spec openspec/changes/board-look-sheet-on-demand/specs/library-stylesheet/spec.md#requirement-the-board-look-rules-are-active-only-where-the-board-look-is-used
 */
export function splitBoardLook(css) {
	const match = /\/\*!\s*cn-board-look-start\s*\*\/([\s\S]*?)\/\*!\s*cn-board-look-end\s*\*\//.exec(css)
	if (!match) {
		return null
	}
	// The base keeps a marker where the block was: enableBoardLookStyle() puts
	// the board sheet right after the <style> that carries it.
	return { base: css.slice(0, match.index) + '/*! cn-board-look-slot */' + css.slice(match.index + match[0].length), board: match[1].trim() }
}
