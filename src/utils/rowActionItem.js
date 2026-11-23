/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * How a row action renders as a menu entry.
 * CnRowActions and CnContextMenu both use these, so a row's actions menu and its right-click menu agree on which entries show and on each entry's key, testid and event payload.
 */

import { evaluateVisibleWhenLocal, isLocallyDecidableVisibleWhen } from './visibleWhen.js'

/**
 * Whether an action is a built-in row action (View, Edit, Copy, Delete).
 *
 * @param {object} action The action.
 * @return {boolean} True for a built-in carrying an id.
 */
function isBuiltin(action) {
	return !!action && action.builtin === true && typeof action.id === 'string' && action.id !== ''
}

/**
 * Whether an action shows for an item.
 * A locally decidable `visibleWhen` that is false hides it; an endpoint or source condition is not decided here.
 * Then `visible` (a boolean or `(item) => boolean`) applies; without it the action shows.
 *
 * @param {object} action The action.
 * @param {object|string|number|null} item The row or right-clicked item.
 * @return {boolean} Whether the entry renders.
 */
export function isRowActionVisible(action, item) {
	if (action.visibleWhen
		&& isLocallyDecidableVisibleWhen(action.visibleWhen)
		&& evaluateVisibleWhenLocal(action.visibleWhen, item) === false) {
		return false
	}
	if (action.visible === undefined) {
		return true
	}
	if (typeof action.visible === 'function') {
		return !!action.visible(item)
	}
	return !!action.visible
}

/**
 * Slugify a label for a `data-testid` suffix: lowercase, kebab-case, non-alphanumerics stripped.
 *
 * @param {string} label The label.
 * @return {string} The slug.
 */
export function slugifyActionLabel(label) {
	// One pass collapses every run of other characters to a single '-', so at
	// most one '-' can sit at either end; trimming it by index keeps this
	// linear. `/^-+|-+$/g` here was a ReDoS on long runs of '-' (CodeQL).
	const slug = String(label || '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
	const start = slug.startsWith('-') ? 1 : 0
	const end = slug.length > start && slug.endsWith('-') ? slug.length - 1 : slug.length
	return slug.slice(start, end)
}

/**
 * The render key of an entry: `builtin:<id>` for a built-in, the label for an app action.
 * An app action with `id: "edit"` therefore never shares a key with the built-in Edit.
 *
 * @param {object} action The action.
 * @return {string} The key.
 */
export function rowActionKey(action) {
	return isBuiltin(action) ? `builtin:${action.id}` : action.label
}

/**
 * The `data-testid` of an entry: `cn-action-item-<id>` for a built-in, in every locale, and the slug of the label for an app action.
 *
 * @param {object} action The action.
 * @return {string} The testid.
 */
export function rowActionTestId(action) {
	return `cn-action-item-${isBuiltin(action) ? action.id : slugifyActionLabel(action.label)}`
}

/**
 * The `action` event payload for an entry: `action` is the label, `id` is the action's id when it has one, and `builtin: true` marks a built-in.
 *
 * @param {object} action The action.
 * @param {object|string|number|null} row The row or right-clicked item.
 * @return {{action: string, row: (object|string|number|null), id?: string, builtin?: true}} The payload.
 */
export function rowActionPayload(action, row) {
	const payload = { action: action.label, row }
	if (typeof action.id === 'string' && action.id !== '') {
		payload.id = action.id
	}
	if (isBuiltin(action)) {
		payload.builtin = true
	}
	return payload
}
