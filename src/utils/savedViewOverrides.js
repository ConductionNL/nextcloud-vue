/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Page config overrides a saved view carries (`overrides`): while the view is
 * active its index page is drawn with these keys laid over its own config,
 * and leaving the view restores the page. A default view declares them in
 * `config.defaultSavedViews[].overrides`; a saved view keeps them in
 * `query.overrides`, so a copy of a default keeps its lens.
 *
 * Only the keys in {@link SAVED_VIEW_OVERRIDE_KEYS} are read. A view changes
 * how the list is presented, never which register or schema it reads or what
 * it may write.
 *
 * @module utils/savedViewOverrides
 * @spec openspec/changes/saved-view-overrides/specs/saved-views-ui/spec.md#requirement-a-view-can-override-the-page-config-while-it-is-active
 */

/**
 * The page config keys a view may override. Each passes through verbatim as
 * the CnIndexPage prop of the same name, so a view block reads like the page
 * config it replaces. `folderSidebar: null` hides the folder sidebar.
 *
 * @type {ReadonlyArray<string>}
 */
export const SAVED_VIEW_CONFIG_KEYS = Object.freeze([
	'title',
	'showTitle',
	'breadcrumb',
	'headerMeta',
	'notice',
	'pageTabs',
	'headerButtons',
	'addLabel',
	'searchPlaceholder',
	'statRow',
	'quickFilters',
	'quickFiltersFrom',
	'quickFilterPlacement',
	'quickFilterMaxVisible',
	'bulkBandAlways',
	'sidePanel',
	'afterList',
	'columns',
	'cardLayout',
	'cardFields',
	'cardComponent',
	'listConfig',
	'viewModes',
	'viewMode',
	'viewSwitch',
	'countText',
	'countSubtitle',
	'footerNote',
	'emptyText',
	'folderSidebar',
	'sidebar',
	'defaultSort',
	'rowClickToView',
	'showViewAction',
	'actions',
	'includeFields',
	'fieldOverrides',
])

/**
 * Shorter names a view may use for a config key.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const SAVED_VIEW_ALIASES = Object.freeze({
	tabs: 'pageTabs',
	views: 'viewModes',
})

/**
 * The keys `header` may group, each a config key of the same name.
 *
 * @type {ReadonlyArray<string>}
 */
export const SAVED_VIEW_HEADER_KEYS = Object.freeze(['title', 'showTitle', 'breadcrumb', 'notice', 'headerMeta', 'headerButtons'])

/**
 * Every key a view's `overrides` may carry: the config keys, their aliases,
 * `header`, `lockedFilters` (added to the page's base `filter`, so the reader
 * cannot clear them), and the three that are not page config: `sortOption`
 * (selected by CnIndexPage), `slots` (mounted by CnPageRenderer) and `badge`
 * (drawn on the view's menu entry).
 *
 * @type {ReadonlyArray<string>}
 */
export const SAVED_VIEW_OVERRIDE_KEYS = Object.freeze([
	...SAVED_VIEW_CONFIG_KEYS,
	...Object.keys(SAVED_VIEW_ALIASES),
	'header',
	'lockedFilters',
	'sortOption',
	'slots',
	'badge',
])

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

/**
 * The overrides of a view, limited to the allowed keys, or null when it
 * carries none. Read from `view.overrides`, else `view.query.overrides`.
 *
 * @param {object|null|undefined} view A View API object or a seeded default view.
 * @return {object|null} The overrides, or null.
 */
export function savedViewOverrides(view) {
	if (!isPlainObject(view)) {
		return null
	}
	const raw = isPlainObject(view.overrides)
		? view.overrides
		: (isPlainObject(view.query) && isPlainObject(view.query.overrides) ? view.query.overrides : null)
	if (!raw) {
		return null
	}
	const out = {}
	for (const key of SAVED_VIEW_OVERRIDE_KEYS) {
		if (raw[key] !== undefined) {
			out[key] = raw[key]
		}
	}
	return Object.keys(out).length > 0 ? out : null
}

/**
 * The page config with a view's overrides laid over it: every config key the
 * view carries replaces the page's (`null` included), `header` and the
 * aliases first, so a key spelled out wins over the same key in `header`.
 * Keys the view does not carry keep the page's value. `slots`, `sortOption`
 * and `badge` are not config keys: see {@link applySavedViewSlots},
 * CnIndexPage and {@link savedViewBadgeCount}.
 *
 * @param {object} config The page config.
 * @param {object|null} overrides The view's overrides.
 * @return {object} The effective config; the given one when there are no overrides.
 */
export function applySavedViewOverrides(config, overrides) {
	const base = isPlainObject(config) ? config : {}
	if (!isPlainObject(overrides)) {
		return base
	}
	const out = { ...base }
	if (isPlainObject(overrides.header)) {
		for (const key of SAVED_VIEW_HEADER_KEYS) {
			if (overrides.header[key] !== undefined) {
				out[key] = overrides.header[key]
			}
		}
	}
	for (const [alias, key] of Object.entries(SAVED_VIEW_ALIASES)) {
		if (overrides[alias] !== undefined) {
			out[key] = overrides[alias]
		}
	}
	for (const key of SAVED_VIEW_CONFIG_KEYS) {
		if (overrides[key] !== undefined) {
			out[key] = overrides[key]
		}
	}
	if (isPlainObject(overrides.lockedFilters)) {
		out.filter = { ...(isPlainObject(out.filter) ? out.filter : {}), ...overrides.lockedFilters }
	}
	return out
}

/**
 * The page's named slots with a view's `slots` laid over them: a name maps to
 * a registry component, or a list of them drawn in order, and `null` takes
 * the page's component out of that slot.
 *
 * @param {object|null|undefined} slots The page's `slots`.
 * @param {object|null} overrides The view's overrides.
 * @return {object} The effective slot map.
 */
export function applySavedViewSlots(slots, overrides) {
	const out = { ...(isPlainObject(slots) ? slots : {}) }
	if (!isPlainObject(overrides) || !isPlainObject(overrides.slots)) {
		return out
	}
	for (const [name, component] of Object.entries(overrides.slots)) {
		const names = Array.isArray(component) ? component.filter((c) => typeof c === 'string' && c !== '') : null
		if (component === null || (names && names.length === 0)) {
			delete out[name]
		} else if (names) {
			out[name] = names.length === 1 ? names[0] : names
		} else if (typeof component === 'string' && component !== '') {
			out[name] = component
		}
	}
	return out
}

/**
 * The badge a view asks for on its menu entry, in the menu entry's terms:
 * `{ count, counterVariant? }`, `count` being `{ register, schema, filter }`.
 *
 * `badge: true`, or a `count` of `true`, counts the view's own list: the
 * page's register, schema and base filter with the view's filters. A `count`
 * object may name another `register`, `schema` or `filter`; what it leaves
 * out comes from the page and the view.
 *
 * @param {boolean|{count?: (boolean|object), counterVariant?: string}|null|undefined} badge The view's `badge`.
 * @param {{register?: string, schema?: string, filter?: object}} page The page config.
 * @param {object} [filters] The view's filters.
 * @return {{count: {register: string, schema: string, filter: object}, counterVariant?: string}|null} The badge, or null.
 */
export function savedViewBadge(badge, page, filters = {}) {
	if (badge !== true && !isPlainObject(badge)) {
		return null
	}
	const raw = badge === true ? true : (badge.count === undefined ? true : badge.count)
	if (raw !== true && !isPlainObject(raw)) {
		return null
	}
	const spec = isPlainObject(raw) ? raw : {}
	const cfg = isPlainObject(page) ? page : {}
	const register = typeof spec.register === 'string' && spec.register !== '' ? spec.register : cfg.register
	const schema = typeof spec.schema === 'string' && spec.schema !== '' ? spec.schema : cfg.schema
	if (typeof register !== 'string' || register === '' || typeof schema !== 'string' || schema === '') {
		return null
	}
	const filter = isPlainObject(spec.filter)
		? spec.filter
		: { ...(isPlainObject(cfg.filter) ? cfg.filter : {}), ...(isPlainObject(filters) ? filters : {}) }
	const out = { count: { register, schema, filter } }
	if (isPlainObject(badge) && badge.counterVariant === 'attention') {
		out.counterVariant = 'attention'
	}
	return out
}
