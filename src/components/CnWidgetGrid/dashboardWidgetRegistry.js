/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * dashboardWidgetRegistry — the shared, mutable single source of truth for the
 * dashboard widget catalog (cn-widget-library, design D1).
 *
 * This registry is intentionally SEPARATE from `BUILT_IN_WIDGETS` (the v2
 * manifest widget set in `builtInWidgets.js`). The two systems compose at the
 * `CnWidgetGrid` resolution boundary — `BUILT_IN_WIDGETS` → this registry →
 * consumer `cnRegistry` inject (override wins last) — but their cores stay
 * independent: `BUILT_IN_WIDGETS` keys are object-detail widgets that need a
 * loaded OpenRegister object, whereas catalog widgets are content/config-driven.
 *
 * Each entry maps a widget `type` string (the value persisted in a placement)
 * to a `{renderer, form, defaultContent, displayName, icon, requires?}`
 * descriptor. The catalog widgets self-register into this registry at import
 * time via `registerDashboardWidget()` (each widget capability owns its own
 * registration; this module ships EMPTY and gains entries as widgets land —
 * Wave 0 has none yet). The `CnAddWidgetModal` consults `listWidgetTypes()` /
 * `getWidgetTypeEntry()` to render the type picker and the per-type sub-form.
 *
 * Registration policy (design D2): last-registration-wins. Registering an
 * existing `type` overwrites the prior entry and emits a development
 * `console.warn` naming the overwritten type so accidental double-registration
 * is visible. Consumer `cnRegistry` overrides still win over this registry at
 * `CnWidgetGrid` resolution time, so an app never has to mutate this shared
 * object to skin a single widget.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */

/**
 * @typedef {object} DashboardWidgetEntry
 * @property {object} renderer Vue component reference for the dashboard grid (may be a lazy/async component definition).
 * @property {object|null} form Vue component reference for the `CnAddWidgetModal` sub-form, or `null`/`undefined` for a renderer-only type (excluded from the picker).
 * @property {object} defaultContent Initial `content` payload seeded into new placements.
 * @property {string} displayName Human-readable type name shown in the type picker.
 * @property {string} icon Material Design icon name used in the type picker.
 * @property {string[]} [surfaces] Surfaces this type may be added on (e.g. `['app-dashboard']`, `['detail-page']`). Omitted means the default dashboard surfaces. A detail-only widget (like `data`) sets `['detail-page']` so it never appears in the dashboard Add-widget picker.
 * @property {{graphql?: string[]}} [requires] Soft runtime-source hint for cross-app widgets — names the sibling-app schemas the widget reads. NEVER a `manifest.dependencies` entry.
 */

/**
 * The shared dashboard widget registry. A mutable object map keyed by widget
 * `type` string. Catalog widgets self-register into it; consumer apps may
 * extend or override it via {@link registerDashboardWidget}.
 *
 * @type {Record<string, DashboardWidgetEntry>}
 */
export const dashboardWidgetRegistry = {}

/**
 * Register (or override) a widget type in the shared registry.
 *
 * Last-registration-wins (design D2): registering an existing `type`
 * overwrites the prior entry. When an override occurs and `NODE_ENV` is not
 * `'production'`, a `console.warn` naming the overwritten type is emitted so
 * accidental double-registration surfaces in development.
 *
 * @param {string} type the widget type key (the persisted placement type).
 * @param {DashboardWidgetEntry} entry the descriptor to register.
 * @return {void}
 */
export function registerDashboardWidget(type, entry) {
	if (typeof type !== 'string' || type === '') {
		return
	}
	const isOverride = Object.prototype.hasOwnProperty.call(dashboardWidgetRegistry, type)
	if (isOverride && typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
		// eslint-disable-next-line no-console
		console.warn(`[dashboardWidgetRegistry] widget type "${type}" is already registered — overriding the previous entry (last-registration-wins).`)
	}
	dashboardWidgetRegistry[type] = entry
}

/**
 * List every registered widget type that has a usable form component. The
 * `CnAddWidgetModal` type picker calls this; renderer-only types (entries with
 * a null/undefined `form`) are excluded so the user is never offered a type
 * they cannot configure.
 *
 * @param {string} [surface] Optional surface key to filter by (default
 *   `'app-dashboard'`). Entries whose `surfaces` excludes it are dropped, so a
 *   detail-only type (e.g. `data`) never appears in the dashboard picker. Pass
 *   the matching surface to list detail-page types.
 * @return {string[]} the registered type keys whose entry has a non-null form.
 */
export function listWidgetTypes(surface = 'app-dashboard') {
	return Object.keys(dashboardWidgetRegistry).filter(
		(type) => dashboardWidgetRegistry[type]
			&& dashboardWidgetRegistry[type].form !== null
			&& dashboardWidgetRegistry[type].form !== undefined
			&& widgetTypeAllowsSurface(dashboardWidgetRegistry[type], surface),
	)
}

/**
 * Look up a widget type entry; returns `null` when the type is unknown so the
 * caller can fall back gracefully.
 *
 * @param {string} type the widget type key.
 * @return {DashboardWidgetEntry|null} the registry entry or `null`.
 */
export function getWidgetTypeEntry(type) {
	return dashboardWidgetRegistry[type] || null
}

/**
 * Whether a registry entry is offerable on a given surface. An entry with no
 * `surfaces` is offerable everywhere; otherwise the surface must be listed.
 *
 * @param {DashboardWidgetEntry} entry the registry entry.
 * @param {string} surface the surface key (e.g. `'app-dashboard'`, `'detail-page'`).
 * @return {boolean} true when the entry may be added on that surface.
 */
export function widgetTypeAllowsSurface(entry, surface) {
	if (!entry) return false
	if (!Array.isArray(entry.surfaces) || entry.surfaces.length === 0) return true
	return entry.surfaces.includes(surface)
}

/**
 * Return a fresh copy of the `defaultContent` blob for a registered type, or
 * `{}` for unknown types so the caller never has to null-check. A shallow copy
 * is returned so a caller mutating the result does not pollute the registry
 * defaults or another caller's content.
 *
 * @param {string} type the widget type key.
 * @return {object} a fresh copy of the type's `defaultContent`.
 */
export function getDefaultContent(type) {
	const entry = dashboardWidgetRegistry[type]
	if (!entry) {
		return {}
	}
	return { ...entry.defaultContent }
}
