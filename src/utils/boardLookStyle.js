/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * boardLookStyle: the board-look rules switch on only where the board look is used.
 *
 * The board look's stylesheets (css/look-board*.css) hold some 260 rules with
 * `:has()`. A browser builds `:has()` invalidation for every such rule in an
 * active stylesheet, whatever its ancestor class, and a dashboard's DOM churn
 * pays for it on every load (150-250 ms warm in an app that never draws the
 * board look). The published ESM build therefore puts those rules in their own
 * `<style data-cn-library-board media="not all">`, right after the library
 * sheet (see installLibraryStyle). A sheet whose media never matches takes no
 * part in style matching or invalidation. The first component that resolves
 * the board look calls {@link enableBoardLookStyle} during setup, before its
 * first render, so there is no unstyled frame.
 *
 * Apps bundle the library with webpack, which drops the ESM entry's bare
 * `import './library-style.js'` (the file is not in package.json#sideEffects),
 * so their library rules come from their own `css/index.css` import. That
 * sheet comes WITHOUT the board-look block; when no board sheet is on the page
 * yet, {@link enableBoardLookStyle} adds one from the rules the build put in
 * boardLookSheet.js, right after the library sheet.
 *
 * The flag is kept on `<html>` (`data-cn-board-look`), so a newer build that
 * replaces the board sheet later installs it switched on. Consumers that
 * bundle the library source get every rule in one sheet, as before; there
 * this is a no-op apart from the flag.
 *
 * @module utils/boardLookStyle
 */

import { BOARD_LOOK_BUILT, BOARD_LOOK_CSS } from './boardLookSheet.js'

/**
 * The attribute on `<html>` that says the board look is in use on this page.
 *
 * @type {string}
 */
export const BOARD_LOOK_FLAG = 'data-cn-board-look'

/**
 * Switch the board-look rules on for this page. Idempotent and cheap after the first call.
 *
 * @param {Document} [doc] The document (defaults to the global one).
 * @return {boolean} True when the call switched the rules on, false when they already were or there is no document.
 * @spec openspec/changes/board-look-sheet-on-demand/specs/library-stylesheet/spec.md#requirement-the-board-look-rules-are-active-only-where-the-board-look-is-used
 */
export function enableBoardLookStyle(doc) {
	const target = doc || (typeof document !== 'undefined' ? document : null)
	if (!target || !target.documentElement) {
		return false
	}
	trackBoardPage(target)
	const root = target.documentElement
	if (root.hasAttribute(BOARD_LOOK_FLAG)) {
		return false
	}
	root.setAttribute(BOARD_LOOK_FLAG, '')
	const boards = target.querySelectorAll('style[data-cn-library-board]')
	boards.forEach((style) => style.removeAttribute('media'))
	if (boards.length === 0 && BOARD_LOOK_CSS !== '') {
		addBoardSheet(target, BOARD_LOOK_CSS, BOARD_LOOK_BUILT)
	}
	return true
}

/**
 * The attribute on `<html>` that says the page shows a board-look region
 * (`.cn-look-board`) and no Nextcloud-look region (`.cn-look-nextcloud`).
 * Rules for surfaces teleported to `<body>` (menus, dropdowns, modal masks)
 * key on `:root[data-cn-board-page] body`.
 *
 * Kept by an observer instead of `body:has(.cn-look-board):not(:has(.cn-look-nextcloud))`:
 * a `:has()` anchored at `<body>` makes the browser restyle the whole page
 * after most DOM insertions (~60-120 ms of style recalc per load on a board dashboard).
 *
 * @type {string}
 */
export const BOARD_PAGE_FLAG = 'data-cn-board-page'

/** Marks a document whose flag is kept, shared by every library copy on the page. */
const TRACKED = '__cnBoardPageTracked'

/**
 * Set or clear {@link BOARD_PAGE_FLAG} from what the page shows now.
 *
 * @param {Document} target The document.
 * @param {HTMLCollection} boards Live `.cn-look-board` elements.
 * @param {HTMLCollection} nextclouds Live `.cn-look-nextcloud` elements.
 */
function syncBoardPage(target, boards, nextclouds) {
	const root = target.documentElement
	const on = boards.length > 0 && nextclouds.length === 0
	if (on !== root.hasAttribute(BOARD_PAGE_FLAG)) {
		root.toggleAttribute(BOARD_PAGE_FLAG, on)
	}
}

/**
 * Keep {@link BOARD_PAGE_FLAG} in step with the page: checked once now and
 * after every batch of inserted, removed or re-classed elements (a mutation
 * observer runs before the next style pass, so no frame shows a stale flag).
 * Idempotent per document.
 *
 * @param {Document} [doc] The document (defaults to the global one).
 * @return {boolean} True when this call started keeping the flag.
 * @spec openspec/changes/board-page-flag/specs/library-stylesheet/spec.md#requirement-teleported-board-surfaces-key-on-a-page-flag-not-on-body-has
 */
export function trackBoardPage(doc) {
	const target = doc || (typeof document !== 'undefined' ? document : null)
	if (!target || !target.documentElement || target[TRACKED]) {
		return false
	}
	target[TRACKED] = true
	const boards = target.getElementsByClassName('cn-look-board')
	const nextclouds = target.getElementsByClassName('cn-look-nextcloud')
	const sync = () => syncBoardPage(target, boards, nextclouds)
	sync()
	const Observer = (target.defaultView || globalThis).MutationObserver
	if (typeof Observer === 'function') {
		new Observer(sync).observe(target.documentElement, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['class'],
		})
	}
	return true
}

/**
 * The comment the build leaves in the library sheet where the board-look block was.
 *
 * @type {string}
 */
export const BOARD_LOOK_SLOT = '/*! cn-board-look-slot */'

/**
 * Put the board-look rules on the page as `<style data-cn-library-board>`,
 * right after the library sheet (the `<style>` holding {@link BOARD_LOOK_SLOT}
 * or `data-cn-library`), so they come after the base rules they refine and
 * before the app's own stylesheets; at the end of `<head>` when there is none.
 *
 * @param {Document} target The document.
 * @param {string} css The board-look rules.
 * @param {string} built The build time of those rules.
 * @return {HTMLStyleElement} The added sheet.
 * @spec openspec/changes/board-look-sheet-in-app-bundles/specs/library-stylesheet/spec.md#requirement-an-app-bundle-carries-the-board-look-rules-switched-off
 */
export function addBoardSheet(target, css, built) {
	const board = target.createElement('style')
	board.setAttribute('data-cn-library-board', String(built || ''))
	board.textContent = css
	const anchor = target.querySelector('style[data-cn-library]')
		|| Array.from(target.querySelectorAll('style')).find((style) => (style.textContent || '').includes(BOARD_LOOK_SLOT))
	if (anchor && anchor.parentNode) {
		anchor.parentNode.insertBefore(board, anchor.nextSibling)
	} else {
		(target.head || target.documentElement).appendChild(board)
	}
	return board
}
