/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Which actions a saved view offers.
 *
 * A triage view should offer three actions and not thirty. The view declares
 * which of the page's it wants.
 *
 * 🔴 IT INTERSECTS, IT NEVER ADDS. A view naming an action the reader may not
 * run does not grant it. This is the whole security property of the feature and
 * it is one line, which is exactly why it is worth a test: a view is a thing
 * any user can create, so "a view may add an action" would mean any user can
 * grant themselves one by saving a view. Narrowing is a preference; widening
 * would be a permission system.
 *
 * A view declaring nothing offers the page's actions, as today.
 *
 * Pure: no store, no fetch, no Vue.
 */

/**
 * The actions a view offers, given what the reader may run.
 *
 * @param {object} options - The call.
 * @param {Array<object>} options.pageActions - The page's actions, each with an `id`.
 * @param {Array<string>} [options.declared] - The action ids the view declares.
 *
 * @return {Array<object>} The actions to render, in the page's order.
 */
export function actionsForView({ pageActions = [], declared = null } = {}) {
	if (Array.isArray(declared) === false) {
		return [...pageActions]
	}

	const wanted = new Set(declared.map((id) => String(id ?? '').trim()))

	// Filtered from the PAGE's list, never built from the view's. Starting
	// from the view's ids and looking each up would let an id the page does
	// not offer through the moment somebody added a lookup fallback.
	return pageActions.filter((action) => wanted.has(String(action?.id ?? '')))
}
