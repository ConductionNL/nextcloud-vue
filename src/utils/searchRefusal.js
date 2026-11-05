/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A refused search, said where it was typed. OpenRegister refuses a `_search`
 * term it cannot parse (an unclosed bracket or quote) with `400 { error,
 * position, term }` rather than running it as a literal, which would return
 * nothing and read as an honest empty result.
 *
 * @module utils/searchRefusal
 */
import { translate as t } from '@nextcloud/l10n'

/** `<reason> at position <n>.`, the shape OpenRegister builds the message in. */
const POSITION_IN_MESSAGE = /\bat position (\d+)\.?\s*$/

/**
 * The 1-based character a refusal points at, or null.
 *
 * @param {object} error The ApiError.
 * @return {number|null}
 */
function positionOf(error) {
	const carried = error.position ?? (error.details && typeof error.details === 'object' ? error.details.position : undefined)
	if (Number.isInteger(carried) && carried > 0) {
		return carried
	}
	const match = POSITION_IN_MESSAGE.exec(String(error.message || ''))
	const parsed = match ? Number(match[1]) : 0
	return parsed > 0 ? parsed : null
}

/**
 * A search refusal, or null when this failure is not one: not a 400, no term
 * typed, or no position to point at (then it is a plain failed fetch).
 *
 * @spec openspec/changes/index-search-refusal/specs/index-search-refusal/spec.md#requirement-a-refused-search-is-said-where-it-was-typed
 * @param {object|null} error The ApiError the store recorded.
 * @param {string} term The term the user typed.
 * @return {{message: string, position: number, term: string, before: string, at: string, after: string}|null}
 */
export function readSearchRefusal(error, term) {
	const typed = typeof term === 'string' ? term : ''
	if (!error || typed.trim() === '' || Number(error.status) !== 400) {
		return null
	}
	const position = positionOf(error)
	if (position === null) {
		return null
	}
	const index = Math.min(position - 1, typed.length)
	return {
		message: String(error.message || ''),
		position,
		term: typed,
		before: typed.slice(0, index),
		at: typed.slice(index, index + 1),
		after: typed.slice(index + 1),
	}
}

/**
 * A refused search as a state notice under the search field: the position in
 * the title, the server's reason, then that the list is not filtered. `title`
 * (with `{position}`) and `after` replace the library's words, through the
 * app's translate.
 *
 * @spec openspec/changes/search-refusal-notice/specs/index-search-refusal/spec.md#requirement-a-refused-search-can-keep-the-rows-and-say-so-under-the-search-field
 * @param {{message: string, position: number}} refusal What `readSearchRefusal` read.
 * @param {{title?: string, after?: string}|null} [words] The page's own words.
 * @param {(text: string) => string} [translate] The app's translate.
 * @return {object} The notice (`{ id, variant, role, layout, title, text }`).
 */
export function searchRefusalNotice(refusal, words, translate) {
	const tr = typeof translate === 'function' ? translate : (text) => text
	const own = words && typeof words === 'object' ? words : {}
	const position = String(refusal.position)
	const title = typeof own.title === 'string' && own.title !== ''
		? tr(own.title).replace(/\{position\}/g, position)
		: t('nextcloud-vue', 'Search term not understood at position {position}:', { position })
	const after = typeof own.after === 'string' && own.after !== ''
		? tr(own.after)
		: t('nextcloud-vue', 'The list is not filtered; adjust the term.')
	return {
		id: 'search-refusal',
		variant: 'error',
		role: 'alert',
		layout: 'inline',
		title,
		text: [refusal.message, after].filter((part) => part !== '').join(' '),
	}
}
