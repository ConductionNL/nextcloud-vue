/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * libraryWidgetKeys — the one vocabulary of widget keys the LIBRARY itself
 * renders, and the only list `validateManifestV2` is allowed to consult.
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * The validator used to carry its own hand-written array of "library built-in
 * widget keys", with a comment instructing whoever added a built-in to append
 * it "in the same PR". That instruction was followed for five keys and missed
 * for six, so the validator knew 11 keys while the library actually rendered
 * 45. Nothing failed when the two disagreed, because the only consumer is an
 * exemption: a key the validator does not recognise is treated as a CUSTOM
 * registry component, which makes a legitimate single-widget library dashboard
 * fail the ADR-036 Decision 1 anti-pattern rule with advice ("declare it as
 * type:'custom'") that is wrong for a library widget.
 *
 * A comment cannot enforce anything, so the array moved here and
 * `tests/utils/libraryWidgetKeys.spec.js` now binds it to the two registries
 * that actually resolve a key at runtime:
 *
 *   1. `BUILT_IN_WIDGETS` (components/CnWidgetGrid/builtInWidgets.js) — the v2
 *      manifest widget set `CnWidgetGrid` resolves a `widgetKey` against.
 *   2. The dashboard widget catalog (`dashboardWidgetRegistry`), populated by
 *      `registerDashboardWidgets.js`. `CnWidgetGrid` falls back to it (third in
 *      the chain, after the consumer registry and `BUILT_IN_WIDGETS`), so a
 *      catalog key renders on a v2 page exactly like a `BUILT_IN_WIDGETS` one.
 *
 * The test asserts SET EQUALITY in both directions against the live registries,
 * so adding a widget to either registry without touching this file fails CI,
 * and deleting one without removing it here fails too. The lists below are the
 * validator's view; the registries are the truth the test holds them to.
 *
 * THE CATALOG IS NOT LEGACY. It is a live half of the same vocabulary, and the
 * old array already conceded the point by exempting `chart` and `stats-block`,
 * which are catalog-only keys that `BUILT_IN_WIDGETS` has never held. What it
 * got wrong was doing that for two keys and not the other thirty-seven.
 * `widgetDispatch.js` unified the two resolution paths for the same reason: a
 * widget authored against one vocabulary was invisible to the other and said
 * nothing about why (101 of 236 detail widgets on hrmq).
 *
 * @module utils/libraryWidgetKeys
 */

import { WIDGET_TYPE_ALIASES } from './widgetTypeAliases.js'

/**
 * Keys of `BUILT_IN_WIDGETS` — the v2 manifest widget set.
 *
 * Kept in the registry's own declaration order so a diff against
 * `builtInWidgets.js` reads straight down.
 *
 * @type {string[]} Frozen.
 */
export const BUILT_IN_WIDGET_KEYS = Object.freeze([
	'object-table',
	'form-renderer',
	'map-viewer',
	'object-geo',
	'card-grid',
	'nav-card-grid',
	'data',
	'metadata',
	'related',
	'integration',
	'banner',
	'audit-trail',
	'header',
	'text',
	'divider',
])

/**
 * Widget types the LIBRARY registers into the dashboard catalog at import time
 * (`registerDashboardWidgets.js` and the widget `index.js` modules it pulls in).
 *
 * Deliberately a static list rather than a read of `dashboardWidgetRegistry`:
 * that object is mutable and consumer-extensible, so deriving the exemption
 * from it at call time would let an app register its own full-page component in
 * the catalog and walk straight through the ADR-036 Decision 1 rule the
 * exemption exists to enforce. Only keys the library itself ships are exempt.
 *
 * Sorted, because unlike `BUILT_IN_WIDGETS` these registrations are spread over
 * ~30 files and have no meaningful declaration order.
 *
 * @type {string[]} Frozen.
 */
export const DASHBOARD_CATALOG_WIDGET_KEYS = Object.freeze([
	'audit-trail',
	'banner',
	'calendar',
	'chart',
	'container',
	'countdown',
	'data',
	'delta',
	'divider',
	'files',
	'flow-runs',
	'gauge',
	'header',
	'image',
	'interaction-form',
	'kb-search',
	'label',
	'link',
	'links',
	'map',
	'menu',
	'nc-widget',
	'news',
	'object-geo',
	'object-list',
	'object-table',
	'people',
	'quicklinks',
	'related',
	'spend-analytics',
	'stat',
	'stats-block',
	'table',
	'tabs',
	'tasks',
	'text',
	'tile',
	'video',
	'workspace-filter',
])

/**
 * Expand a key set over `WIDGET_TYPE_ALIASES` so both spellings of an aliased
 * widget are present whenever either one is.
 *
 * `CnWidgetGrid` resolves a key and its canonical form (`object-table` ⇄
 * `table`, `map-viewer` ⇄ `map`), so both spellings render and both must be
 * exempt. Today each registry happens to hold one side of each pair, which is
 * exactly the accident that would silently stop being true when the next alias
 * lands.
 *
 * @param {Set<string>} keys The key set to expand, mutated in place.
 * @return {Set<string>} The same set.
 */
function expandAliases(keys) {
	for (const [alias, canonical] of Object.entries(WIDGET_TYPE_ALIASES)) {
		if (keys.has(alias) || keys.has(canonical)) {
			keys.add(alias)
			keys.add(canonical)
		}
	}
	return keys
}

/**
 * Every widget key the library renders itself: both registries, plus both
 * spellings of every alias.
 *
 * A `widgetKey` in this list is served by a library `Cn*` SFC and does NOT
 * count as a custom registry component for the single-12×12-widget dashboard
 * rule (ADR-036 Decision 1).
 *
 * @type {string[]} Frozen.
 */
export const LIBRARY_WIDGET_KEYS = Object.freeze([
	...expandAliases(new Set([
		...BUILT_IN_WIDGET_KEYS,
		...DASHBOARD_CATALOG_WIDGET_KEYS,
	])),
])
