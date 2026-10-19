/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The columns-of-cards view mode of an index page.
 *
 * @type {string}
 */
export const KANBAN_VIEW_MODE = 'kanban'

/**
 * Former view-mode names and the mode each one now opens. `board` shipped in
 * released manifests, saved views and addresses (`?_view=board`), so it is
 * still read, and read as `kanban`.
 *
 * @deprecated Write `kanban`; `board` is read for existing manifests only.
 * @type {Readonly<{[alias: string]: string}>}
 */
export const VIEW_MODE_ALIASES = Object.freeze({ board: KANBAN_VIEW_MODE })

/**
 * The current name of a view mode: a deprecated alias becomes the mode it
 * stands for, anything else is returned unchanged.
 *
 * @param {unknown} mode A view mode, possibly a deprecated alias.
 * @return {unknown} The current name, or `mode` itself when it is no alias.
 */
export function normalizeViewMode(mode) {
	if (typeof mode === 'string' && Object.hasOwn(VIEW_MODE_ALIASES, mode)) {
		return VIEW_MODE_ALIASES[mode]
	}
	return mode
}

/**
 * A list of view modes with each alias replaced by its current name, in
 * order and without duplicates (`['board', 'kanban']` is one `kanban`). A
 * value that is not an array is returned unchanged.
 *
 * @param {unknown} modes The view modes.
 * @return {unknown} The normalized list, or `modes` itself when it is no array.
 */
export function normalizeViewModes(modes) {
	if (!Array.isArray(modes)) {
		return modes
	}
	const out = []
	for (const mode of modes) {
		const name = normalizeViewMode(mode)
		if (!out.includes(name)) {
			out.push(name)
		}
	}
	return out
}

/**
 * An object keyed by view mode with each alias key replaced by its current
 * name. A key under its current name wins over the same mode under an alias.
 *
 * @param {unknown} byMode The object keyed by mode, e.g. `viewSwitchLinks`.
 * @return {unknown} The normalized object, or `byMode` itself when it is no object.
 */
export function normalizeViewModeKeys(byMode) {
	if (!byMode || typeof byMode !== 'object' || Array.isArray(byMode)) {
		return byMode
	}
	const out = {}
	for (const [mode, value] of Object.entries(byMode)) {
		const name = normalizeViewMode(mode)
		if (name !== mode && Object.hasOwn(byMode, name)) {
			continue
		}
		out[name] = value
	}
	return out
}
