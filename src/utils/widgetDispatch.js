/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * widgetDispatch — how a detail-page widget definition picks its renderer.
 *
 * These predicates used to live as methods on `CnDetailPage`, each one calling
 * `findWidget(item)` first. That was fine while the detail grid was the only
 * surface rendering a widget definition. `CnTabsWidget` is a second one: it
 * renders the SAME definitions with no card chrome, because the tab strip owns
 * the title and the Actions menu instead.
 *
 * Two copies of "is this a card widget?" is exactly the kind of thing that
 * drifts. One copy grows a type, the other does not, and the symptom is a
 * widget that renders correctly on the page and blank inside a tab, with
 * nothing in the console either way. So the decisions live here as pure
 * functions over a widget DEFINITION, and both surfaces import them.
 *
 * The functions take the resolved definition, not a layout item. Resolving an
 * item to a definition needs the surface's own widget list, which is the one
 * part that genuinely differs between the two.
 *
 * @module utils/widgetDispatch
 */

import { getWidgetTypeEntry } from '../components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { BUILT_IN_WIDGETS } from '../components/CnWidgetGrid/builtInWidgets.js'
import { canonicalWidgetType } from './widgetTypeAliases.js'

/**
 * Content-only catalog widgets: bare renderers with no chrome of their own.
 * On a card surface they need the titled wrapper; inside a tab panel the strip
 * already supplies the title, so they render bare.
 *
 * @type {string[]}
 */
export const CONTENT_ONLY_TYPES = Object.freeze(['object-list', 'table', 'files'])

/**
 * The stored content/config blob for a widget definition.
 *
 * @param {object} def The widget definition.
 * @return {object} The definition's `content`, or an empty object.
 */
export function widgetContentOf(def) {
	return (def && def.content && typeof def.content === 'object') ? def.content : {}
}

/**
 * Whether the definition is the schema-driven `data` widget.
 *
 * @param {object} def The widget definition.
 * @return {boolean} true for `type: 'data'`.
 */
export function isDataWidgetDef(def) {
	return Boolean(def) && def.type === 'data'
}

/**
 * Whether the definition is the schema-driven `related` widget.
 *
 * @param {object} def The widget definition.
 * @return {boolean} true for `type: 'related'`.
 */
export function isRelatedWidgetDef(def) {
	return Boolean(def) && def.type === 'related'
}

/**
 * Whether the definition is the `object-geo` widget.
 *
 * @param {object} def The widget definition.
 * @return {boolean} true for `type: 'object-geo'`.
 */
export function isGeoWidgetDef(def) {
	return Boolean(def) && def.type === 'object-geo'
}

/**
 * Whether the definition names a registered integration leaf.
 *
 * @param {object} def The widget definition.
 * @return {boolean} true for `type: 'integration'` with an `integrationId`.
 */
export function isIntegrationWidgetDef(def) {
	return Boolean(def) && def.type === 'integration' && typeof def.integrationId === 'string'
}

/**
 * Whether the definition is a content-only catalog widget.
 *
 * @param {object} def The widget definition.
 * @return {boolean} true when the type is in {@link CONTENT_ONLY_TYPES}.
 */
export function isContentOnlyWidgetDef(def) {
	return Boolean(def) && CONTENT_ONLY_TYPES.includes(def.type)
}

/**
 * Whether the definition is a registry "card" widget: a self-contained KPI,
 * gauge or delta tile that headlines itself (registry entry `card: true`).
 *
 * @param {object} def The widget definition.
 * @return {boolean} true when the registry entry declares `card`.
 */
export function isCardWidgetDef(def) {
	if (!def || !def.type) return false
	const entry = getWidgetTypeEntry(def.type)
	return Boolean(entry && entry.card === true)
}

/**
 * Resolve the registered RENDERER for a content-driven catalog widget type.
 *
 * Integration widgets resolve separately, and `data` needs object context the
 * caller supplies, so both are excluded from this generic fallback.
 *
 * Resolution order is consumer registry, then the dashboard catalog, then
 * `BUILT_IN_WIDGETS`. Those last two were near-disjoint vocabularies until they
 * were unified here: the dashboard catalog held chart / map / object-list /
 * related / stats-block / table, `BUILT_IN_WIDGETS` held audit-trail / banner /
 * card-grid / data / divider / form-renderer / header / integration /
 * map-viewer / metadata / nav-card-grid / object-geo / related / text, and only
 * `related` was in both. A widget authored against one was invisible to the
 * other, and the surface rendered nothing while saying nothing about why. On
 * hrmq that was 101 of 236 detail widgets.
 *
 * @param {object} def The widget definition.
 * @param {object} [cnRegistry] The consumer's component registry, if any.
 * @return {object|null} The renderer component, or null.
 */
export function resolveRegistryRenderer(def, cnRegistry = {}) {
	if (!def || !def.type || def.type === 'integration' || def.type === 'data') return null
	// Consumer registry FIRST — the order REQ-MVR-005 mandates ("Custom widget
	// overrides built-in"), and the order CnWidgetGrid already uses.
	const consumer = (cnRegistry || {})[def.type]
	if (consumer) return consumer.component ?? consumer
	const entry = getWidgetTypeEntry(canonicalWidgetType(def.type))
	if (entry && entry.renderer) return entry.renderer
	return BUILT_IN_WIDGETS[canonicalWidgetType(def.type)] || BUILT_IN_WIDGETS[def.type] || null
}

/**
 * The effective title for a widget definition.
 *
 * A title-owning type (registry `ownsTitle`, e.g. `related`) keeps its editable
 * title in `content.title`, and that MUST win over the chrome `def.title`.
 * Otherwise a non-empty seed title permanently shadows the user's edit and the
 * title can never be changed. Every other type reads `def.title` first.
 *
 * @param {object} def The widget definition.
 * @return {string|undefined} The title, or undefined to let the widget default.
 */
export function widgetTitleOf(def) {
	if (!def) return undefined
	const content = widgetContentOf(def)
	const entry = getWidgetTypeEntry(def.type)
	if (entry && entry.ownsTitle) {
		return content.title || undefined
	}
	return def.title || content.title || undefined
}
