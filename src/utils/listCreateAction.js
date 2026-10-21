/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * listCreateAction — what a list's Add does when the manifest declares a
 * `content.createAction`, and whether it shows.
 *
 * A list's Add opens its own create form by default. `createAction` replaces
 * that with one action in the manifest action shape (`open-modal`,
 * `handler`, `navigate`, …), for a create that has to go through the app
 * rather than straight to the object API. Its `visibleWhen` is evaluated
 * against the record of the page the list sits on; while it fails, the Add
 * is hidden and `hiddenNote` may say why.
 *
 * `hiddenNote` is a string, or a list of `{ when, text }` where the first
 * entry whose `when` holds against the record wins. The text is returned
 * untranslated; the caller runs it through the host translate.
 *
 * Both CnObjectListWidget (its own Add buttons) and CnDetailWidgetHost (the
 * catalog Add in the card or panel menu) read this, so the two never
 * disagree about whether Add is there.
 *
 * @module utils/listCreateAction
 */

import { evaluateVisibleWhenLocal } from './visibleWhen.js'

/**
 * The declared create action, or null.
 *
 * @param {object|null} content The list's `content` block.
 * @return {object|null} The action.
 */
export function listCreateAction(content) {
	const action = content && content.createAction
	if (!action || typeof action !== 'object' || Array.isArray(action) || typeof action.type !== 'string') {
		return null
	}
	return action
}

/**
 * The note for a hidden create action, untranslated, or ''.
 *
 * @param {string|Array<{when: object, text: string}>|undefined} note The declared `hiddenNote`.
 * @param {object} record The page record.
 * @return {string} The note.
 */
function hiddenNoteFor(note, record) {
	if (typeof note === 'string') {
		return note
	}
	if (!Array.isArray(note)) {
		return ''
	}
	const hit = note.find((entry) => entry && typeof entry.text === 'string' && evaluateVisibleWhenLocal(entry.when, record))
	return hit ? hit.text : ''
}

/**
 * Whether the create action shows against this record, and the note to show
 * instead when it does not.
 *
 * Without a `visibleWhen` the action always shows. With one, it stays hidden
 * until the record is known, so a page still loading does not flash an Add
 * it is about to take away; no note is given then either.
 *
 * @param {object|null} content The list's `content` block.
 * @param {object|null} record The page record, or null while it loads.
 * @return {{action: (object|null), visible: boolean, note: string}} The state.
 */
export function createActionState(content, record) {
	const action = listCreateAction(content)
	if (!action) {
		return { action: null, visible: true, note: '' }
	}
	if (!action.visibleWhen) {
		return { action, visible: true, note: '' }
	}
	if (!record || typeof record !== 'object') {
		return { action, visible: false, note: '' }
	}
	if (evaluateVisibleWhenLocal(action.visibleWhen, record)) {
		return { action, visible: true, note: '' }
	}
	return { action, visible: false, note: hiddenNoteFor(action.hiddenNote, record) }
}
