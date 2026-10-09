/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The personal lenses of an index page (Favourites, Recent, Following) as
 * quick filters, appended after the page's own.
 *
 * @spec openspec/changes/record-favourite-and-follow/tasks.md#task-3
 */
import { translate as t } from '@nextcloud/l10n'

/** Lens id to the query key OpenRegister reads. */
export const LENS_FILTER_KEYS = { favourite: '_favourite', recent: '_recent', watching: '_watching', unread: '_unread' }

/**
 * Quick filters for the requested lenses. Unknown ids are ignored.
 *
 * @param {string[]} lenses Any of `favourite`, `recent`, `watching`, `unread`.
 * @return {Array<{label: string, filter: object, lens: string}>} One tab per lens, in the order asked.
 */
export function personalLensTabs(lenses) {
	const labels = {
		favourite: t('nextcloud-vue', 'Favourites'),
		recent: t('nextcloud-vue', 'Recent'),
		watching: t('nextcloud-vue', 'Following'),
		unread: t('nextcloud-vue', 'Unread'),
	}
	return (Array.isArray(lenses) ? lenses : [])
		.filter((id, i, all) => Object.hasOwn(LENS_FILTER_KEYS, id) && all.indexOf(id) === i)
		.map((id) => ({ label: labels[id], filter: { [LENS_FILTER_KEYS[id]]: true }, lens: id }))
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
	if (tabs.length === 0) {
		return quickFilters
	}
	const own = Array.isArray(quickFilters) ? quickFilters : []
	return own.length > 0
		? [...own, ...tabs]
		: [{ label: t('nextcloud-vue', 'All'), filter: {}, default: true }, ...tabs]
}
