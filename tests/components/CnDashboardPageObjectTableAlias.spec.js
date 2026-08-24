/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `object-table` and `table` are TWO DIFFERENT dashboard widgets, and
 * WIDGET_TYPE_ALIASES says one is a spelling of the other.
 *
 *     WIDGET_TYPE_ALIASES = { 'object-table': 'table', 'map-viewer': 'map' }
 *
 *     registerDashboardWidget('table',        { renderer: CnObjectListWidget2 })
 *     registerDashboardWidget('object-table', { renderer: CnHostedObjectTable })
 *
 * CnDashboardPage canonicalised the type BEFORE the catalog lookup, so
 * `object-table` resolved to the `table` entry and the dashboard rendered
 * CnObjectListWidget2 — a different component — instead of the object-table
 * host adapter that maps the stored `content` blob onto the widget's props.
 *
 * The failure is silent in the worst way: a widget still appears, so nothing
 * is blank and nothing throws. It is simply the wrong one. That is the exact
 * failure mode CnDashboardPageWidgetRegistryUnification.spec.js was written to
 * prevent ("it still rendered, just the wrong one, which is worse than a
 * blank") — reintroduced by the canonicalisation added alongside it.
 *
 * Caught by larpingapp's e2e on the nc-vue 2.8.2 -> 2.9.2 bump:
 *   dashboard-analytics-widgets > recent list renders on dashboard
 *   expect(locator('.cn-widget-object-table')).toBeVisible() — not found.
 *
 * Aliases still apply, but only as a FALLBACK: a type that is registered in
 * its own right wins over its alias target. `map-viewer` has no catalog entry
 * of its own and so still resolves through the alias to `map`.
 */
import { mount } from '@vue/test-utils'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
// Populates the catalog with `table`, `chart`, `map`, `object-list`, …
import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'
// Side-effect module that registers `object-table` -> CnHostedObjectTable.
import '../../src/components/CnWidgetObjectTable/dashboardRegistration.js'

function mountPage({ type, registry = {} } = {}) {
	return mount(CnDashboardPage, {
		propsData: {
			layout: [{ id: 1, widgetId: 'w', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 3 }],
			widgets: [{ id: 'w', type, title: 'Widget' }],
		},
		provide: { cnRegistry: registry },
		stubs: { CnWidgetWrapper: true },
	})
}

describe('CnDashboardPage — an aliased type must not shadow its own catalog entry', () => {
	// THE PREMISE. If these two ever became the same component the rest of this
	// file would pass while asserting nothing.
	it('registers object-table and table as genuinely different renderers', () => {
		const objectTable = getWidgetTypeEntry('object-table')
		const table = getWidgetTypeEntry('table')

		expect(objectTable && objectTable.renderer).toBeTruthy()
		expect(table && table.renderer).toBeTruthy()
		expect(objectTable.renderer).not.toBe(table.renderer)
	})

	it('resolves `object-table` to its OWN renderer, not the aliased `table` one', () => {
		const objectTable = getWidgetTypeEntry('object-table')
		const w = mountPage({ type: 'object-table' })

		expect(w.vm.registryRenderer({ widgetId: 'w' })).toBe(objectTable.renderer)
	})

	it('still resolves a plain `table` widget to the table renderer', () => {
		const table = getWidgetTypeEntry('table')
		const w = mountPage({ type: 'table' })

		expect(w.vm.registryRenderer({ widgetId: 'w' })).toBe(table.renderer)
	})

	// The alias is not being removed — it is being demoted to a fallback.
	// `map-viewer` has no catalog entry of its own, so it must still reach `map`.
	it('keeps alias resolution for a type with no catalog entry of its own', () => {
		expect(getWidgetTypeEntry('map-viewer')).toBeFalsy()
		const map = getWidgetTypeEntry('map')
		expect(map && map.renderer).toBeTruthy()

		const w = mountPage({ type: 'map-viewer' })
		expect(w.vm.registryRenderer({ widgetId: 'w' })).toBe(map.renderer)
	})

	// isCardWidget canonicalises the same way and therefore read the WRONG
	// entry's `card` flag, so the chrome could differ from the widget.
	it('reads the card flag from object-table’s own entry', () => {
		const objectTable = getWidgetTypeEntry('object-table')
		const w = mountPage({ type: 'object-table' })

		expect(w.vm.isCardWidget({ widgetId: 'w' })).toBe(objectTable.card === true)
	})
})
