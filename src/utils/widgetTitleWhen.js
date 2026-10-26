// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
import { evaluateVisibleWhenLocal } from './visibleWhen.js'

const cache = new WeakMap()

/**
 * A widget definition with its `titleWhen` resolved into a plain `title`.
 *
 * `titleWhen` is `[{ when?, text }]`: the first entry whose `when` (the
 * `visibleWhen` grammar, read against the record and its `@context` rows)
 * holds sets the title; an entry without `when` always holds, and an empty
 * `text` means the card has no title. With no record yet, or no entry
 * holding, the definition keeps its own `title`. Every reader of `title`
 * (the card, the tab strip, a leaf card) then sees plain text.
 *
 * A definition without `titleWhen` is returned as it is; a resolved one is
 * the same object for as long as its title stays the same, so a render does
 * not hand the widget a new definition each time.
 *
 * @param {object|null|undefined} def The widget definition.
 * @param {object|null} data The record, with `@context` when the page loads it.
 * @return {object|null|undefined} The definition to hand on.
 * @spec openspec/changes/widget-title-when/specs/widget-title-when/spec.md#requirement-a-widget-title-can-depend-on-the-record
 */
export function withTitleWhen(def, data) {
	if (!def || typeof def !== 'object' || !Array.isArray(def.titleWhen)) {
		return def
	}
	const entry = data
		? def.titleWhen.find((item) => item && typeof item.text === 'string' && (!item.when || evaluateVisibleWhenLocal(item.when, data)))
		: null
	const title = entry ? entry.text : def.title
	const known = cache.get(def)
	if (known && known.title === title) {
		return known.def
	}
	const resolved = { ...def, title }
	delete resolved.titleWhen
	cache.set(def, { title, def: resolved })
	return resolved
}

/**
 * A list of widget definitions with each `titleWhen` resolved.
 *
 * @param {Array<object>|null|undefined} defs The definitions.
 * @param {object|null} data The record, with `@context`.
 * @return {Array<object>} The definitions to hand on.
 * @spec openspec/changes/widget-title-when/specs/widget-title-when/spec.md#requirement-a-widget-title-can-depend-on-the-record
 */
export function withTitlesWhen(defs, data) {
	if (!Array.isArray(defs)) {
		return []
	}
	return defs.some((def) => def && Array.isArray(def.titleWhen)) ? defs.map((def) => withTitleWhen(def, data)) : defs
}
