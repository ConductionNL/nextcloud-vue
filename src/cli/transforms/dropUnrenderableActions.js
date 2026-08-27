/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * Drop action entries that can never render, from a page's `config.actions[]`
 * and top-level `actions[]`.
 *
 * `CnRowActions` draws an entry from its `label` and `icon`. An entry with
 * neither becomes a full-height, clickable, INERT row in the overflow menu —
 * invisible except as blank space above the real actions. Two v1 shapes
 * produce it, both meaning "also show the built-in action":
 *
 *   "edit"                        a bare string
 *   { "key": "edit", "type": … }  a key-only object
 *
 * Neither is how built-ins are enabled — `config.actionToggles` / the
 * `show*Action` keys do that, and they are on by default — so both are pure
 * loss: the author got a blank row instead of the action they asked for, and
 * the built-in they meant was already there. 15 of them shipped across 6
 * dossiq pages before the v2 schema started rejecting the shape.
 *
 * Dropping rather than rewriting is deliberate. Rewriting `"edit"` into a
 * synthesised `{id, label: "Edit", …}` would add a SECOND Edit entry next to
 * the built-in one, which is a different wrong answer.
 *
 * @param {object} page A v1 page definition (any type).
 * @return {{ page: object, count: number }} Transformed page and the number of
 *   unrenderable entries removed.
 */
function dropUnrenderableActions(page) {
	let count = 0

	/**
	 * Keep only entries that can render.
	 *
	 * @param {*} actions The declared actions.
	 * @return {*} The filtered actions, or the input when it is not an array.
	 */
	function keepRenderable(actions) {
		if (!Array.isArray(actions)) return actions
		return actions.filter((action) => {
			const renderable = Boolean(action)
				&& typeof action === 'object'
				&& !Array.isArray(action)
				&& typeof action.label === 'string'
				&& action.label !== ''
			if (!renderable) count++
			return renderable
		})
	}

	let updatedPage = page

	if (Array.isArray(page.actions)) {
		updatedPage = { ...updatedPage, actions: keepRenderable(page.actions) }
	}

	const cfg = page.config || {}
	if (Array.isArray(cfg.actions)) {
		updatedPage = {
			...updatedPage,
			config: { ...cfg, actions: keepRenderable(cfg.actions) },
		}
	}

	return { page: updatedPage, count }
}

module.exports = { dropUnrenderableActions }
