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
 * The flag is kept on `<html>` (`data-cn-board-look`), so a newer build that
 * replaces the board sheet later installs it switched on. Consumers that
 * bundle the library source or import `css/index.css` get every rule in one
 * sheet, as before; there this is a no-op apart from the flag.
 *
 * @module utils/boardLookStyle
 */

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
	const root = target.documentElement
	if (root.hasAttribute(BOARD_LOOK_FLAG)) {
		return false
	}
	root.setAttribute(BOARD_LOOK_FLAG, '')
	target.querySelectorAll('style[data-cn-library-board]').forEach((style) => style.removeAttribute('media'))
	return true
}
