/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

'use strict'

/**
 * The five bespoke custom-dashboard component names observed across the fleet.
 * A `type:"custom"` page pointing at one of these is a dashboard implemented as
 * a hand-written Vue component instead of the canonical `type:"dashboard"` +
 * `widgets[]` shape.
 */
const NAMED_DASHBOARD_COMPONENTS = new Set([
	'Dashboard',
	'DashboardIndex',
	'DashboardView',
	'DashboardCustomView',
	// Kept verbatim: this is the literal Vue component name shipped in the
	// Learniq (formerly Scholiq) app's manifests, matched as DATA. The
	// 2026-08-21 rename did not change already-published manifests.
	'ScholiqDashboards',
])

/**
 * promoteCustomDashboard — custom-dashboard → type:"dashboard" promotion.
 *
 * Converts a `type:"custom"` page whose `component` is one of the five known
 * bespoke dashboard components into a canonical `type:"dashboard"` page so the
 * dashboard becomes Buildiq-editable and manifest-shape-checkable.
 *
 * When the page carries manifest-declared widgets (top-level `widgets[]`, or a
 * dialect-B `config.widgets[]` + `config.layout[]` pair) those are left in place
 * for `convergeTypedWidgets` to fold into the canonical `widgets[]`. When the
 * bespoke component renders logic that has NO manifest-widget expression, the
 * page is still promoted but flagged for manual review (the former component
 * name is reported, never silently dropped) and given an empty `widgets[]` plus
 * a `_note` marker.
 *
 * Idempotence: a page that is not `type:"custom"`, or whose component is not a
 * known bespoke dashboard, is returned by reference (byte-identical no-op).
 *
 * @param {object} page A v2 page definition
 * @return {{ page: object, promoted: boolean, flagged: string|null }}
 *   `flagged` is the component name that needs manual widget authoring, or null.
 */
function promoteCustomDashboard(page) {
	if (!page || typeof page !== 'object') {
		return { page, promoted: false, flagged: null }
	}
	if (page.type !== 'custom') {
		return { page, promoted: false, flagged: null }
	}
	const component = page.component
	if (typeof component !== 'string' || !NAMED_DASHBOARD_COMPONENTS.has(component)) {
		return { page, promoted: false, flagged: null }
	}

	const cfg = (page.config && typeof page.config === 'object' && !Array.isArray(page.config))
		? page.config
		: null
	const hasConfigWidgets = cfg && (Array.isArray(cfg.widgets) && cfg.widgets.length > 0)
	const hasTopWidgets = Array.isArray(page.widgets) && page.widgets.length > 0
	const hasExpressibleWidgets = Boolean(hasConfigWidgets || hasTopWidgets)

	// Strip the bespoke `component` field and any prior custom-page `_note`.
	const { component: _c, _note: _n, ...restPage } = page
	const promoted = { ...restPage, type: 'dashboard' }

	if (!hasExpressibleWidgets) {
		promoted.widgets = Array.isArray(page.widgets) ? page.widgets : []
		promoted._note = `TODO: manual review — bespoke dashboard component "${component}" `
			+ 'rendered logic with no manifest-widget expression; author widgets[] to '
			+ 'preserve behaviour before merge.'
		return { page: promoted, promoted: true, flagged: component }
	}

	return { page: promoted, promoted: true, flagged: null }
}

module.exports = { promoteCustomDashboard, NAMED_DASHBOARD_COMPONENTS }
