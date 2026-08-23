/**
 * Widget type aliases — one vocabulary across both resolution paths.
 *
 * The library grew two widget registries that resolve different names for the
 * same components:
 *
 * - `BUILT_IN_WIDGETS` (components/CnWidgetGrid/builtInWidgets.js), which
 *   `CnWidgetGrid` resolves a manifest `widgetKey` against;
 * - the dashboard catalog (`dashboardWidgetRegistry`), which `CnDetailPage` and
 *   `CnDashboardPage` resolve a widget definition's `type` against.
 *
 * Only `related` appeared in both. Worse, two concepts were registered under
 * two names each — `table` / `object-table` and `map` / `map-viewer` — so the
 * SAME widget was addressable by a different string depending on which page
 * component happened to render it, with no error when you picked the wrong one:
 * the widget simply did not appear.
 *
 * This maps the aliases onto one canonical name so either spelling resolves
 * from either path. It deliberately does NOT rename anything in an app's
 * manifest: both spellings stay valid for ever, because a manifest is data an
 * app already shipped.
 *
 * @spec openspec/architecture/adr-036-universal-widget-manifest.md
 */

/**
 * Alias → canonical widget type.
 *
 * Canonical is whichever name the dashboard catalog registers, because that is
 * the registry the widget PICKER reads: a user adding a widget through the UI
 * gets the catalog's name, so making it canonical keeps hand-authored and
 * UI-authored manifests spelling the same thing.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const WIDGET_TYPE_ALIASES = Object.freeze({
	'object-table': 'table',
	'map-viewer': 'map',
})

/**
 * Resolve a widget type or key to its canonical name.
 *
 * Returns the input unchanged when it is not an alias, so it is safe to call on
 * every lookup.
 *
 * @param {string} type A widget `type` or manifest `widgetKey`.
 * @return {string} The canonical type name.
 */
export function canonicalWidgetType(type) {
	if (typeof type !== 'string' || type === '') return type
	return WIDGET_TYPE_ALIASES[type] || type
}
