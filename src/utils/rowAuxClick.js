/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * rowAuxClick — decide whether an `auxclick` on a clickable row or card is a
 * middle click meant for the row itself.
 *
 * `@click.stop` on a nested control does not stop `auxclick`, and browsers
 * also fire `auxclick` for the right button, so a row that listens to it must
 * filter both out itself.
 *
 * Whoever opens a row in a new tab marks the event with `markNewTabHandled`, so
 * a second listener for the same click (a host behind a library default) can
 * check `isNewTabHandled` and not open a second tab.
 *
 * @module utils/rowAuxClick
 */

// Events that opened a new tab. Not `defaultPrevented`, which any unrelated
// handler can set on a modified or middle click.
const newTabHandled = new WeakSet()

const NESTED_CONTROL = 'a, button, input, select, textarea, label, summary, [role="button"], [role="checkbox"], [role="link"], [contenteditable="true"]'

/**
 * Whether the event started on a control nested inside the element that
 * listens for it (not the listening element itself).
 *
 * @param {Event} event The click or auxclick event.
 * @return {boolean}
 */
export function isFromNestedControl(event) {
	const target = event && event.target
	const root = event && event.currentTarget
	if (!target || typeof target.closest !== 'function') {
		return false
	}
	const control = target.closest(NESTED_CONTROL)
	if (!control || control === root) {
		return false
	}
	return !root || typeof root.contains !== 'function' || root.contains(control)
}

/**
 * Whether an `auxclick` is a middle click on the row body, which should open
 * the row's target in a new tab.
 *
 * @param {MouseEvent} event The auxclick event.
 * @return {boolean}
 */
export function isRowMiddleClick(event) {
	return Boolean(event && event.button === 1 && !isFromNestedControl(event))
}

/**
 * Whether `openRowTarget` would open this click in a new tab.
 *
 * @param {MouseEvent|KeyboardEvent|null|undefined} event The click event.
 * @return {boolean}
 */
export function isNewTabClick(event) {
	return Boolean(event && (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1))
}

/**
 * Whether an earlier listener already opened this click in a new tab.
 *
 * @param {MouseEvent|KeyboardEvent|null|undefined} event The click event.
 * @return {boolean}
 */
export function isNewTabHandled(event) {
	return Boolean(isNewTabClick(event) && newTabHandled.has(event))
}

/**
 * Mark a new-tab click as handled after opening it, see `isNewTabHandled`.
 * Also prevents the event's default, so the browser does not act on the
 * click as well.
 *
 * @param {MouseEvent|KeyboardEvent|null|undefined} event The click event.
 * @param {boolean} opened Whether the target was opened.
 * @return {void}
 */
export function markNewTabHandled(event, opened) {
	if (!opened || !isNewTabClick(event)) {
		return
	}
	newTabHandled.add(event)
	if (typeof event.preventDefault === 'function') {
		event.preventDefault()
	}
}
