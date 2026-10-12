/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The personal lenses of an index page (Following, Recent, Unread) as quick
 * filters, appended after the page's own.
 *
 * There is no Favourites lens any more: a favourite is a follow with
 * notifications off (OpenRegister `merge-follow-and-favourites`), so
 * `favourite` is an alias of `watching` and asking for both gives one tab.
 *
 * @spec openspec/changes/one-follow-control/specs/record-follow/spec.md#requirement-index-pages-offer-one-following-lens-and-a-follow-column
 */
import { translate as t } from '@nextcloud/l10n'

/** Lens id to the query key OpenRegister reads. */
export const LENS_FILTER_KEYS = { recent: '_recent', watching: '_watching', unread: '_unread' }

/** Deprecated lens ids and the lens they now mean. */
const LENS_ALIASES = { favourite: 'watching' }

/**
 * Quick filters for the requested lenses. Unknown ids are ignored.
 *
 * @param {string[]} lenses Any of `watching`, `recent`, `unread`, and the deprecated `favourite` (read as `watching`).
 * @return {Array<{label: string, filter: object, lens: string}>} One tab per lens, in the order asked.
 */
export function personalLensTabs(lenses) {
	const labels = {
		recent: t('nextcloud-vue', 'Recent'),
		watching: t('nextcloud-vue', 'Following'),
		unread: t('nextcloud-vue', 'Unread'),
	}
	return (Array.isArray(lenses) ? lenses : [])
		.map((id) => (Object.hasOwn(LENS_ALIASES, id) ? LENS_ALIASES[id] : id))
		.filter((id, i, all) => Object.hasOwn(LENS_FILTER_KEYS, id) && all.indexOf(id) === i)
		.map((id) => ({ label: labels[id], filter: { [LENS_FILTER_KEYS[id]]: true }, lens: id }))
}

/**
 * Turn the `empty` / `notEmpty` shorthand of quick filters into a filter.
 *
 * `{ label: "Not logged in yet", empty: "lastLoginAt" }` is the rows where the
 * field has no value: the filter `{ lastLoginAt: { isnull: true } }`, which
 * OpenRegister reads as `lastLoginAt[isnull]=true`. `notEmpty` is the rows
 * where it has one. Either takes a field or a list of fields and merges with
 * the entry's own `filter`. Returns the same array when no entry uses it.
 *
 * @param {Array<object>|null} quickFilters The page's quick filters.
 * @return {Array<object>|null} The quick filters with the shorthand expanded.
 */
export function expandEmptyFilters(quickFilters) {
	if (!Array.isArray(quickFilters)) {
		return quickFilters
	}
	const uses = (tab) => tab && typeof tab === 'object' && (tab.empty || tab.notEmpty)
	if (!quickFilters.some(uses)) {
		return quickFilters
	}
	const fieldsOf = (value) => (Array.isArray(value) ? value : [value]).filter((f) => typeof f === 'string' && f !== '')
	return quickFilters.map((tab) => {
		if (!uses(tab)) {
			return tab
		}
		const filter = { ...(tab.filter && typeof tab.filter === 'object' ? tab.filter : {}) }
		for (const field of fieldsOf(tab.empty)) {
			filter[field] = { isnull: true }
		}
		for (const field of fieldsOf(tab.notEmpty)) {
			filter[field] = { isnull: false }
		}
		return { ...tab, filter }
	})
}

/**
 * The page's quick filters with its personal lenses appended. A page with no
 * quick filters of its own gets an "All" tab first, so a lens is not active
 * before the person asks for it.
 *
 * @param {Array<object>|null} quickFilters The page's own quick filters.
 * @param {string[]}           lenses       The requested lenses.
 * @return {Array<object>|null} The combined list, or the page's own list unchanged when no lens is asked for.
 */
export function withPersonalLenses(quickFilters, lenses) {
	const tabs = personalLensTabs(lenses)
	const expanded = expandEmptyFilters(quickFilters)
	if (tabs.length === 0) {
		return expanded
	}
	const own = Array.isArray(expanded) ? expanded : []
	return own.length > 0
		? [...own, ...tabs]
		: [{ label: t('nextcloud-vue', 'All'), filter: {}, default: true }, ...tabs]
}
