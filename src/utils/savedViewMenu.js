// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

import { translate as t } from '@nextcloud/l10n'

/**
 * Saved views a user added to the app menu.
 *
 * Per user, in the app's preferences (`cn_saved_view_menu`), as a list of
 * `{ id, page, name }`: the view id (or `default:<slug>`), the route name of
 * the index page it filters, and the name to show. The view itself is not
 * touched, so a view shared with the user can be added like an own one, and
 * removing it from the menu never deletes it.
 *
 * A menu entry links to its page with `?savedView=<id>`; the page applies
 * that view. The entries form a "My views" group in the menu.
 *
 * @spec openspec/changes/saved-views-manage-and-defaults/tasks.md#task-7
 */

/** The preference key the list is stored under. */
export const SAVED_VIEW_MENU_KEY = 'cn_saved_view_menu'

/** The id of the "My views" caption. */
export const SAVED_VIEW_MENU_CAPTION = 'saved-views-caption'

/** The id prefix of a menu entry made from a saved view. */
export const SAVED_VIEW_MENU_PREFIX = 'saved-view-'

/**
 * The stored list, cleaned: entries with an id and a page, no repeats.
 *
 * @param {unknown} entries The stored value.
 * @return {Array<{id: string, page: string, name: string}>} The list.
 */
export function normalizeSavedViewMenu(entries) {
	const seen = new Set()
	const out = []
	for (const e of Array.isArray(entries) ? entries : []) {
		const id = e && (typeof e.id === 'string' || typeof e.id === 'number') ? String(e.id) : ''
		const page = e && typeof e.page === 'string' ? e.page : ''
		if (id === '' || page === '' || seen.has(`${page}|${id}`)) {
			continue
		}
		seen.add(`${page}|${id}`)
		out.push({ id, page, name: e && typeof e.name === 'string' && e.name !== '' ? e.name : id })
	}
	return out
}

/**
 * Add an entry, or remove it when it is already there.
 *
 * @param {Array<object>} entries The current list.
 * @param {{id: string, page: string, name: string}} entry The view.
 * @return {Array<{id: string, page: string, name: string}>} The new list.
 */
export function toggleSavedViewMenuEntry(entries, entry) {
	const list = normalizeSavedViewMenu(entries)
	const id = String(entry.id)
	const present = list.some((e) => e.id === id && e.page === entry.page)
	if (present) {
		return list.filter((e) => !(e.id === id && e.page === entry.page))
	}
	return normalizeSavedViewMenu([...list, { id, page: entry.page, name: entry.name }])
}

/**
 * Bring one page's entries in line with the views that page can show:
 * current names, and no entry for a view that was deleted or is no longer
 * shared with the user. Other pages' entries are left alone.
 *
 * @param {Array<object>} entries The current list.
 * @param {string} page The page's route name.
 * @param {Array<object>} views The views the page lists (defaults included).
 * @return {Array<{id: string, page: string, name: string}>} The new list.
 */
export function syncSavedViewMenu(entries, page, views) {
	const byId = new Map((Array.isArray(views) ? views : []).map((v) => [String(v.id || v.slug), v]))
	return normalizeSavedViewMenu(entries)
		.filter((e) => e.page !== page || byId.has(e.id))
		.map((e) => (e.page === page ? { ...e, name: byId.get(e.id).name || e.name } : e))
}

/**
 * Whether a menu entry, or one of its children, opens a page.
 *
 * @param {object} item The menu entry.
 * @param {Set<string>} pages Route names.
 * @return {boolean}
 */
function opensAnyOf(item, pages) {
	if (!item) {
		return false
	}
	if (pages.has(item.route)) {
		return true
	}
	return Array.isArray(item.children) && item.children.some((child) => child && pages.has(child.route))
}

/**
 * The manifest menu with the user's saved views in it, as their own group:
 * a "My views" caption and one entry per view. The group goes after the
 * last entry that opens one of the views' pages, before the next caption,
 * so it sits with the list it filters (and after a user group such as "My
 * case types" that opens the same list).
 *
 * @param {Array<object>} menu The manifest's `menu`.
 * @param {Array<object>} entries The user's list.
 * @return {Array<object>} A new menu, in manifest order; the given one when the list is empty.
 */
export function withSavedViewMenu(menu, entries) {
	const list = normalizeSavedViewMenu(entries)
	if (!Array.isArray(menu) || list.length === 0) {
		return menu
	}
	const sorted = menu.map((item, index) => ({ item, index })).sort((a, b) => byOrder(a.item, b.item) || a.index - b.index).map(({ item }) => item)
	const pages = new Set(list.map((e) => e.page))
	let last = -1
	sorted.forEach((item, index) => {
		if (opensAnyOf(item, pages)) {
			last = index
		}
	})
	let at = sorted.length
	if (last >= 0) {
		const next = sorted.findIndex((item, index) => index > last && item && item.type === 'caption')
		at = next === -1 ? sorted.length : next
	}
	const group = [
		{ id: SAVED_VIEW_MENU_CAPTION, type: 'caption', label: t('nextcloud-vue', 'My views') },
		...list.map((e) => ({
			id: `${SAVED_VIEW_MENU_PREFIX}${e.id}`,
			label: e.name,
			route: e.page,
			query: { savedView: e.id },
			icon: 'FilterOutline',
		})),
	]
	const before = at > 0 ? sorted[at - 1] : null
	const after = at < sorted.length ? sorted[at] : null
	const from = before && typeof before.order === 'number' ? before.order : null
	const to = after && typeof after.order === 'number' ? after.order : null
	if (from !== null || to !== null) {
		// Orders between the neighbours, so CnAppNav's own sort keeps the group here.
		const start = from ?? (to - group.length - 1)
		const step = to === null ? 1 : (to - start) / (group.length + 1)
		group.forEach((item, k) => {
			item.order = start + step * (k + 1)
		})
	}
	return [...sorted.slice(0, at), ...group, ...sorted.slice(at)]
}

/**
 * Manifest menu order: entries with an `order` first, by it; the rest keep their place.
 *
 * @param {object} a First entry.
 * @param {object} b Second entry.
 * @return {number}
 */
function byOrder(a, b) {
	const aHas = typeof a?.order === 'number'
	const bHas = typeof b?.order === 'number'
	if (aHas !== bHas) {
		return aHas ? -1 : 1
	}
	return aHas ? a.order - b.order : 0
}
