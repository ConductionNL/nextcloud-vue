/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * The shortcuts a working list offers, in the order they are listed.
 *
 * One catalogue, read by three surfaces: the key handler, the command palette
 * and the help sheet. A shortcut that only the handler knows about is a
 * shortcut nobody can find, and one that only the help sheet knows about is a
 * line that does nothing. Neither is a shortcut.
 *
 * `keys` is the chord as a person reads it. `id` is what the page dispatches.
 *
 * @type {Array<{id: string, keys: string, description: string}>}
 */
export const LIST_SHORTCUTS = Object.freeze([
	{ id: 'row-next', keys: 'j', description: 'Move to the next row' },
	{ id: 'row-previous', keys: 'k', description: 'Move to the previous row' },
	{ id: 'row-open', keys: 'Enter', description: 'Open the focused row' },
	{ id: 'row-primary', keys: 'p', description: 'Run the focused row’s first action' },
	{ id: 'row-menu', keys: 'm', description: 'Open the focused row’s action menu' },
	{ id: 'row-quick-edit', keys: 'e', description: 'Quick edit the focused row' },
	{ id: 'row-select', keys: 'x', description: 'Select or deselect the focused row' },
	{ id: 'bulk-action', keys: 'b', description: 'Run a bulk action on the selection' },
	{ id: 'list-search', keys: '/', description: 'Jump to the search box' },
	{ id: 'list-help', keys: '?', description: 'List these shortcuts' },
])

/**
 * The chord a keyboard event reads as, in the spelling `LIST_SHORTCUTS` uses.
 *
 * @param {KeyboardEvent} event The event.
 * @return {string} The chord, or ''.
 */
export function chordOf(event) {
	if (!event || typeof event.key !== 'string') {
		return ''
	}
	if (event.ctrlKey || event.metaKey || event.altKey) {
		return ''
	}
	return event.key
}

/**
 * Whether a keyboard event happened somewhere the list must keep its hands
 * off: a text field, a textarea, a select, or anything a person is editing.
 *
 * A single-letter shortcut that fires while someone is typing a case number
 * into the search box is not a shortcut, it is a bug that eats their input.
 *
 * @param {EventTarget} target The event target.
 * @return {boolean} True when the list should not act.
 */
export function isTypingTarget(target) {
	if (!target || typeof target !== 'object') {
		return false
	}
	const tag = typeof target.tagName === 'string' ? target.tagName.toUpperCase() : ''
	if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
		return true
	}
	return target.isContentEditable === true
}

/**
 * The shortcut a keyboard event asks for, or null.
 *
 * @param {KeyboardEvent} event The event.
 * @param {Array<object>} [shortcuts] The catalogue.
 * @return {(object|null)} The matched shortcut.
 */
export function shortcutFor(event, shortcuts = LIST_SHORTCUTS) {
	if (isTypingTarget(event && event.target)) {
		return null
	}
	const chord = chordOf(event)
	if (chord === '') {
		return null
	}
	return shortcuts.find((entry) => entry.keys === chord) || null
}

/**
 * The catalogue as command-palette entries, so every shortcut the list offers
 * is findable by someone who has never used the list.
 *
 * `run` is looked up per shortcut id on the handler map the page passes. A
 * shortcut the page has no handler for is left out of the palette rather than
 * listed as something that does nothing.
 *
 * @param {object} handlers Handlers by shortcut id.
 * @param {object} [options] Options.
 * @param {string} [options.section] The palette section to file them under.
 * @param {Array<object>} [options.shortcuts] The catalogue.
 * @return {Array<object>} The palette entries.
 */
export function listPaletteCommands(handlers, { section = 'List', shortcuts = LIST_SHORTCUTS } = {}) {
	const map = handlers && typeof handlers === 'object' ? handlers : {}
	return shortcuts
		.filter((entry) => typeof map[entry.id] === 'function')
		.map((entry) => ({
			id: `list.${entry.id}`,
			title: entry.description,
			section,
			shortcut: entry.keys,
			run: map[entry.id],
		}))
}
