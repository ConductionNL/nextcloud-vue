// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

import { translate as t } from '@nextcloud/l10n'

/**
 * Saved views a user added to the app menu.
 *
 * Per user, in the app's preferences (`cn_saved_view_menu`), as a list of
 * `{ id, page, name, badge? }`: the view id (or `default:<slug>`), the route
 * name of the index page it filters, the name to show, and the count the
 * entry shows when the view's `overrides.badge` asks for one. The view itself is not
 * touched, so a view shared with the user can be added like an own one, and
 * removing it from the menu never deletes it.
 *
 * A menu entry links to its page with `?savedView=<id>`; the page applies
 * that view. The entries form the "My views" group at the bottom of the menu.
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
 * A menu badge as stored on an entry: `{ count, counterVariant? }`, where `count` is
 * a menu entry `count` (a number or `{ register, schema, filter? }`).
 *
 * @param {unknown} badge The stored value.
 * @return {{count: (number|object), counterVariant?: string}|null} The badge, or null.
 */
function normalizeBadge(badge) {
	if (!badge || typeof badge !== 'object') {
		return null
	}
	const count = badge.count
	const isSource = count && typeof count === 'object' && typeof count.register === 'string' && typeof count.schema === 'string'
	if (!isSource && !(typeof count === 'number' && count >= 0)) {
		return null
	}
	return badge.counterVariant === 'attention' ? { count, counterVariant: 'attention' } : { count }
}

/**
 * The stored list, cleaned: entries with an id and a page, no repeats.
 *
 * @param {unknown} entries The stored value.
 * @return {Array<{id: string, page: string, name: string, badge?: object}>} The list.
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
		const entry = { id, page, name: e && typeof e.name === 'string' && e.name !== '' ? e.name : id }
		const badge = normalizeBadge(e.badge)
		if (badge) {
			entry.badge = badge
		}
		out.push(entry)
	}
	return out
}

/**
 * Add an entry, or remove it when it is already there.
 *
 * @param {Array<object>} entries The current list.
 * @param {{id: string, page: string, name: string, badge?: object}} entry The view.
 * @return {Array<{id: string, page: string, name: string, badge?: object}>} The new list.
 */
export function toggleSavedViewMenuEntry(entries, entry) {
	const list = normalizeSavedViewMenu(entries)
	const id = String(entry.id)
	const present = list.some((e) => e.id === id && e.page === entry.page)
	if (present) {
		return list.filter((e) => !(e.id === id && e.page === entry.page))
	}
	return normalizeSavedViewMenu([...list, { id, page: entry.page, name: entry.name, badge: entry.badge }])
}

/**
 * Bring one page's entries in line with the views that page can show:
 * current names and badges, and no entry for a view that was deleted or is
 * no longer shared with the user. Other pages' entries are left alone. A
 * view's badge is read from its `menuBadge` (see `withSavedViewMenu`).
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
		.map((e) => {
			if (e.page !== page) {
				return e
			}
			const view = byId.get(e.id)
			const { badge, ...rest } = e
			const next = normalizeBadge(view.menuBadge)
			return normalizeSavedViewMenu([{ ...rest, name: view.name || e.name, ...(next ? { badge: next } : {}) }])[0]
		})
}

/** The id of the line the "My views" group shows while it is empty. */
export const SAVED_VIEW_MENU_EMPTY = 'saved-views-empty'

/**
 * The manifest menu with the user's saved views in it, as the standard "My
 * views" group at the bottom of the menu: a caption and one entry per view,
 * after every main entry and so just above the footer entries (Help,
 * Advanced), which CnAppNav draws apart. Every app gets the same group in the
 * same place (Ruben's design rule, 19 Oct); it replaces app-specific groups
 * such as dossiq's "My case types".
 *
 * An entry with a badge carries it as the menu entry's `count` (and
 * `counterVariant`), which CnAppRoot fetches like any filtered menu count.
 *
 * With `showEmpty`, an app that offers saved views shows the group also while
 * the user pinned none, with one line saying how to add one, so the group can
 * be found.
 *
 * @param {Array<object>} menu The manifest's `menu`.
 * @param {Array<object>} entries The user's list.
 * @param {{showEmpty?: boolean}} [options] Options.
 * @return {Array<object>} A new menu, in manifest order; the given one when there is nothing to add.
 * @spec openspec/changes/my-views-menu-section/specs/app-nav/spec.md#requirement-every-app-menu-ends-with-my-views
 */
export function withSavedViewMenu(menu, entries, options = {}) {
	const list = normalizeSavedViewMenu(entries)
	if (!Array.isArray(menu) || (list.length === 0 && options.showEmpty !== true)) {
		return menu
	}
	const sorted = menu.map((item, index) => ({ item, index })).sort((a, b) => byOrder(a.item, b.item) || a.index - b.index).map(({ item }) => item)
	const group = [
		{ id: SAVED_VIEW_MENU_CAPTION, type: 'caption', label: t('nextcloud-vue', 'My views') },
		...(list.length > 0
			? list.map((e) => ({
					id: `${SAVED_VIEW_MENU_PREFIX}${e.id}`,
					label: e.name,
					route: e.page,
					query: { savedView: e.id },
					icon: 'FilterOutline',
					...(e.badge || {}),
				}))
			: [{ id: SAVED_VIEW_MENU_EMPTY, type: 'hint', label: t('nextcloud-vue', 'Add a view to the menu from Filters') }]),
	]
	// Orders after the last ordered entry, so CnAppNav's own sort keeps the
	// group at the bottom.
	const orders = sorted.map((item) => item && item.order).filter((order) => typeof order === 'number')
	if (orders.length > 0) {
		const start = Math.max(...orders)
		group.forEach((item, k) => {
			item.order = start + k + 1
		})
	}
	return [...sorted, ...group]
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
