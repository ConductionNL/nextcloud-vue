/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * Add `type: "handler"` to any action entry in a page's `config.actions[]`
 * or top-level `actions[]` that is missing the `type` field.
 *
 * This normalises v1.3.0 action declarations where `type` was optional
 * (implicitly `"handler"`) so that v2 validators that treat `type` as an
 * explicit discriminator see the value they expect.
 *
 * v1 shape (action without type):
 *   { id, label, handler?, route?, ... }
 *
 * v2 shape (action with explicit type):
 *   { id, label, type: "handler", handler?, ... }
 *
 * @param {object} page A v1 page definition (any type)
 * @return {{ page: object, count: number }} Transformed page and count of
 *   action entries that received an explicit type.
 */
function addExplicitActionTypes(page) {
	let count = 0

	// Helper that adds type:"handler" to actions missing a type field
	function normalizeActions(actions) {
		if (!Array.isArray(actions)) return actions
		return actions.map((action) => {
			if (!action || typeof action !== 'object') return action
			if (action.type === undefined) {
				count++
				return { ...action, type: 'handler' }
			}
			return action
		})
	}

	let updatedPage = page

	// Normalize top-level page.actions[] (v2 schema has page.actions[])
	if (Array.isArray(page.actions)) {
		updatedPage = { ...updatedPage, actions: normalizeActions(page.actions) }
	}

	// Normalize config.actions[] (v1 pattern — index pages etc.)
	const cfg = page.config || {}
	if (Array.isArray(cfg.actions)) {
		updatedPage = {
			...updatedPage,
			config: { ...cfg, actions: normalizeActions(cfg.actions) },
		}
	}

	return { page: updatedPage, count }
}

module.exports = { addExplicitActionTypes }
