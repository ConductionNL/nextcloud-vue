/**
 * Per-user dashboard layouts for the object store.
 *
 * A manifest dashboard is the same page for everybody. This plugin lets one
 * user keep their own arrangement of it without changing what anybody else
 * sees: the manifest layout stays the base and the reset target, and the
 * user's record is a thin overlay of geometry on top of it.
 *
 * 🔴 THE MANIFEST WINS ON MEMBERSHIP, THE USER WINS ON GEOMETRY. A widget the
 * admin removes disappears for everyone, stored record or not; a widget the
 * admin adds appears for everyone, at the end of the user's grid. What the
 * user owns is where their widgets sit, not which widgets exist. Reading it
 * the other way round would let a stored record resurrect a widget the admin
 * deliberately took off the page, and nothing on screen would say why it was
 * back.
 *
 * 🔴 IT WRITES THROUGH `writeUserPreference`, NOT A SECOND HTTP PATH. That
 * helper already addresses the app's preference route, mirrors to the browser
 * so a layout survives an instance without the endpoint, and refuses an SPA
 * shell answering 200 with HTML. A second client here would be a second answer
 * about where a user's settings live.
 *
 * State added:
 *   - `dashboardLayouts` — stored records by page id
 *
 * Actions added:
 *   - `loadDashboardLayout(appId, pageId)` — read this user's record
 *   - `saveDashboardLayout(appId, pageId, layout)` — store the geometry
 *   - `resetDashboardLayout(appId, pageId)` — drop the record
 *
 * @example
 * import { createObjectStore, dashboardLayoutsPlugin } from '@conduction/nextcloud-vue'
 *
 * const useMyStore = createObjectStore('myapp', {
 *   plugins: [dashboardLayoutsPlugin()],
 * })
 *
 * const store = useMyStore()
 * await store.loadDashboardLayout('dossiq', 'Dashboard')
 * await store.saveDashboardLayout('dossiq', 'Dashboard', grid)
 *
 * @return {object} Plugin definition
 */

import {
	readUserPreference,
	writeUserPreference,
} from '../../composables/useUserPreferences.js'

/**
 * The preference key one page's layout is stored under.
 *
 * Keyed by page so two dashboards in one app do not overwrite each other. The
 * prefix is spelled once here because a read and a write that disagree about
 * the key read as a layout that never persists.
 *
 * @param {string} pageId The manifest page id.
 * @return {string} The preference key.
 */
export function dashboardLayoutKey(pageId) {
	return 'dashboard-layout.' + String(pageId || '')
}

/**
 * The geometry fields a stored record keeps.
 *
 * Only these five travel. A record that carried the whole layout item would
 * carry the widget's title, its style and its config, and the next manifest
 * change would be silently overridden by a copy the user never edited.
 *
 * @type {Array<string>}
 */
export const LAYOUT_GEOMETRY_FIELDS = ['gridX', 'gridY', 'gridWidth', 'gridHeight']

/**
 * One layout item reduced to what a user record stores.
 *
 * @param {object} item The layout item.
 * @return {object} The stored entry.
 */
function geometryOf(item) {
	const entry = { widgetId: String(item?.widgetId ?? '') }
	for (const field of LAYOUT_GEOMETRY_FIELDS) {
		if (item?.[field] !== undefined) {
			entry[field] = item[field]
		}
	}

	return entry
}

/**
 * Merge a user's stored record over the manifest layout.
 *
 * The rule, in the order it is applied:
 *
 * 1. The manifest layout is the base. Every widget it declares is present and
 *    every widget it does not declare is absent, whatever the record says.
 * 2. A widget with a stored entry takes that entry's geometry.
 * 3. A widget with no stored entry keeps its manifest position, so a page that
 *    gains a widget shows it rather than hiding it until the user next edits.
 * 4. The user's own order is kept for the widgets they arranged, and widgets
 *    the admin added since are appended after them.
 *
 * Pure on purpose: this is the rule the whole change turns on, and a rule that
 * can only be exercised by mounting a grid is a rule nobody tests at the edges.
 *
 * @param {Array<object>} manifestLayout The layout the manifest ships.
 * @param {object|Array<object>|null} record The user's stored record, or its items.
 * @return {Array<object>} The merged layout.
 */
export function mergeUserLayout(manifestLayout, record) {
	const base = Array.isArray(manifestLayout) ? manifestLayout : []
	const items = Array.isArray(record) ? record : (record?.items || [])
	if (!Array.isArray(items) || items.length === 0) {
		return [...base]
	}

	const stored = new Map()
	for (const entry of items) {
		const widgetId = String(entry?.widgetId ?? '')
		if (widgetId !== '') {
			stored.set(widgetId, entry)
		}
	}

	const arranged = []
	const appended = []

	for (const item of base) {
		const widgetId = String(item?.widgetId ?? '')
		const entry = stored.get(widgetId)
		if (!entry) {
			// A widget the admin added since the user last arranged the page.
			// It goes after what they arranged rather than into the middle of
			// it, where it would push their own grid around.
			appended.push({ ...item })
			continue
		}

		const merged = { ...item }
		for (const field of LAYOUT_GEOMETRY_FIELDS) {
			if (entry[field] !== undefined) {
				merged[field] = entry[field]
			}
		}
		arranged.push(merged)
	}

	// The user's own order, for the widgets they arranged.
	arranged.sort((a, b) => {
		const order = [...stored.keys()]
		return order.indexOf(String(a.widgetId)) - order.indexOf(String(b.widgetId))
	})

	return [...arranged, ...appended]
}

/**
 * Plugin definition.
 *
 * @param {object} [options] Options.
 * @param {object} [options.http] An axios-shaped client, for tests.
 * @param {object} [options.storage] A localStorage-shaped store, for tests.
 * @return {object} Plugin definition
 */
export function dashboardLayoutsPlugin(options = {}) {
	return {
		name: 'dashboardLayouts',

		state: () => ({
			/**
			 * Stored layout records by page id.
			 *
			 * @type {Record<string, object|null>}
			 */
			dashboardLayouts: {},
		}),

		actions: {
			/**
			 * Read this user's stored layout for one page.
			 *
			 * Answers null when there is none, which is what a page with no
			 * user record must show: the manifest layout, untouched. An empty
			 * array would read the same to a caller that only checks length,
			 * so null is returned and the difference is stated.
			 *
			 * @param {string} appId The Nextcloud app id.
			 * @param {string} pageId The manifest page id.
			 * @return {Promise<object|null>} The record, or null.
			 */
			async loadDashboardLayout(appId, pageId) {
				const record = await readUserPreference(
					appId,
					dashboardLayoutKey(pageId),
					null,
					options,
				)

				const items = Array.isArray(record) ? record : record?.items
				const stored = Array.isArray(items) && items.length > 0
					? { items }
					: null

				this.dashboardLayouts = { ...this.dashboardLayouts, [pageId]: stored }

				return stored
			},

			/**
			 * Store this user's geometry for one page.
			 *
			 * Only the geometry is stored, never the whole layout item: a
			 * record carrying a widget's title and config would override the
			 * next manifest change with a copy the user never edited.
			 *
			 * @param {string} appId The Nextcloud app id.
			 * @param {string} pageId The manifest page id.
			 * @param {Array<object>} layout The layout as it now stands.
			 * @return {Promise<boolean>} Whether it reached the server.
			 */
			async saveDashboardLayout(appId, pageId, layout) {
				const items = (Array.isArray(layout) ? layout : [])
					.map(geometryOf)
					.filter((entry) => entry.widgetId !== '')

				this.dashboardLayouts = { ...this.dashboardLayouts, [pageId]: { items } }

				return await writeUserPreference(
					appId,
					dashboardLayoutKey(pageId),
					{ items },
					options,
				)
			},

			/**
			 * Drop this user's record, returning the page to the manifest.
			 *
			 * An empty record is written rather than a delete, because the
			 * preference route answers one verb for a value and a written
			 * empty reads back as "no arrangement" on every instance,
			 * including one whose endpoint has no delete at all.
			 *
			 * @param {string} appId The Nextcloud app id.
			 * @param {string} pageId The manifest page id.
			 * @return {Promise<boolean>} Whether it reached the server.
			 */
			async resetDashboardLayout(appId, pageId) {
				this.dashboardLayouts = { ...this.dashboardLayouts, [pageId]: null }

				return await writeUserPreference(
					appId,
					dashboardLayoutKey(pageId),
					{ items: [] },
					options,
				)
			},
		},
	}
}
