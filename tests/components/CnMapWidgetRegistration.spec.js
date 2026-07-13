/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The `map` dashboard widget is in the catalog.
 *
 * Reported live: there was no Map option in Add Widget. CnMapWidget existed, was a
 * complete Leaflet map, and was even exported from the package root — but its
 * index.js never called registerDashboardWidget(), so the dashboard catalog (which
 * CnAddWidgetModal reads) had no idea it existed.
 *
 * Registration is done INLINE in registerDashboardWidgets.js, not only via the bare
 * `import '../CnMapWidget/index.js'` side effect: package.json declares
 * `sideEffects: ["**\/*.css"]`, so bundlers may legally DROP a bare import of a
 * side-effect-free JS module — which already shipped a dist without the object-list
 * registration once. These tests pin that the type is actually registered.
 */
import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'
import { getWidgetTypeEntry, listWidgetTypes } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { hasRegistryIcon } from '../../src/components/CnWidgetGrid/widgetIcons.js'

describe('the map dashboard widget', () => {
	it('is registered, so Add Widget can offer it', () => {
		const entry = getWidgetTypeEntry('map')

		expect(entry).toBeTruthy()
		expect(entry.renderer).toBeTruthy()
		// Without a form the Add Widget dialog cannot configure it.
		expect(entry.form).toBeTruthy()
		expect(entry.displayName).toBe('Map')
	})

	it('appears in the addable widget list', () => {
		const types = listWidgetTypes().map((w) => w.type ?? w)
		expect(types).toContain('map')
	})

	it('has an icon the registry can actually render', () => {
		const entry = getWidgetTypeEntry('map')
		// An unregistered name silently resolves to the DEFAULT icon, so the widget
		// would show a dashboard glyph instead of a map. Gate on real membership.
		expect(hasRegistryIcon(entry.icon)).toBe(true)
	})

	it('defaults to an OpenRegister data source the resolver understands', () => {
		const { defaultContent } = getWidgetTypeEntry('map')

		// CnMapWidget's resolver reads markers.dataSource.{register, schema}.
		expect(defaultContent.markers.dataSource).toEqual({ register: '', schema: '' })
		expect(defaultContent.autoFit).toBe(true)
		expect(Array.isArray(defaultContent.center)).toBe(true)
		expect(defaultContent.center).toHaveLength(2)
	})
})

// A map with no tile layer renders as a grey box. CnMapWidget's `basemaps` prop is
// opt-in and defaults to `[]`, so a freshly-placed Map widget had NO background at all
// — Leaflet's controls rendered over blank grey, which reads as "broken", not "empty".
describe('the map widget ships a basemap', () => {
	it('defaults to a tile layer, so the map is not a grey box', () => {
		const { defaultContent } = getWidgetTypeEntry('map')

		expect(Array.isArray(defaultContent.basemaps)).toBe(true)
		expect(defaultContent.basemaps.length).toBeGreaterThan(0)
		expect(defaultContent.basemaps[0].url).toContain('{z}/{x}/{y}')
	})

	it('uses a tile host the Nextcloud CSP allows', () => {
		const { defaultContent } = getWidgetTypeEntry('map')
		// img-src on this app permits *.tile.openstreetmap.org; a host outside the CSP
		// is silently blocked — the tiles do not even produce a failed request.
		expect(defaultContent.basemaps[0].url).toContain('tile.openstreetmap.org')
	})
})
