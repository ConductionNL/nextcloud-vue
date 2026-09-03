/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * libraryWidgetKeys — the anti-drift binding.
 *
 * `utils/libraryWidgetKeys.js` is the list `validateManifestV2` consults to
 * decide whether a `widgetKey` names a library widget or a custom registry
 * component. It cannot import the registries themselves (they pull in ~50 SFCs
 * and their chart/map dependencies, and the validator is a lazily-loaded chunk
 * that must stay cheap), so the list is written out by hand — which is exactly
 * how the previous copy drifted to 11 keys while the library rendered 45.
 *
 * These tests are the thing that makes the hand-written list safe. They import
 * the LIVE registries and assert set equality in BOTH directions, so:
 *
 *   - adding a widget to a registry without listing it here fails, and
 *   - deleting one from a registry without unlisting it here fails too.
 *
 * The final block goes further than symbol comparison: it drives every
 * registry key through the actual validator on a single 12×12 dashboard page
 * and asserts the ADR-036 Decision 1 rule stays quiet. That is the behaviour
 * the list exists to produce, so it is the behaviour under test.
 */

// Populates `dashboardWidgetRegistry` by side effect — every catalog widget
// self-registers on import. Must run before the registry is read.
import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'
import { dashboardWidgetRegistry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { BUILT_IN_WIDGETS } from '../../src/components/CnWidgetGrid/builtInWidgets.js'
import {
	BUILT_IN_WIDGET_KEYS,
	DASHBOARD_CATALOG_WIDGET_KEYS,
	LIBRARY_WIDGET_KEYS,
} from '../../src/utils/libraryWidgetKeys.js'
import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

describe('libraryWidgetKeys — bound to BUILT_IN_WIDGETS', () => {
	it('lists exactly the keys the v2 widget registry ships', () => {
		// sort() on both sides so declaration order is free to change.
		expect([...BUILT_IN_WIDGET_KEYS].sort())
			.toEqual(Object.keys(BUILT_IN_WIDGETS).sort())
	})

	it('leaves no registry entry outside the validator view', () => {
		const view = new Set(LIBRARY_WIDGET_KEYS)
		const unseen = Object.keys(BUILT_IN_WIDGETS).filter((key) => !view.has(key))
		expect(unseen).toEqual([])
	})
})

describe('libraryWidgetKeys — bound to the dashboard widget catalog', () => {
	it('is populated at all (an empty catalog would make every check vacuous)', () => {
		expect(Object.keys(dashboardWidgetRegistry).length).toBeGreaterThan(0)
	})

	it('lists exactly the widget types the library registers', () => {
		expect([...DASHBOARD_CATALOG_WIDGET_KEYS].sort())
			.toEqual(Object.keys(dashboardWidgetRegistry).sort())
	})

	it('leaves no catalog entry outside the validator view', () => {
		const view = new Set(LIBRARY_WIDGET_KEYS)
		const unseen = Object.keys(dashboardWidgetRegistry).filter((key) => !view.has(key))
		expect(unseen).toEqual([])
	})
})

describe('libraryWidgetKeys — alias spellings', () => {
	it('carries both spellings of every aliased widget', () => {
		const view = new Set(LIBRARY_WIDGET_KEYS)
		// CnWidgetGrid resolves a key AND its canonical form, so both render.
		expect(view.has('object-table')).toBe(true)
		expect(view.has('table')).toBe(true)
		expect(view.has('map-viewer')).toBe(true)
		expect(view.has('map')).toBe(true)
	})

	it('claims nothing the library cannot actually render', () => {
		const rendered = new Set([
			...Object.keys(BUILT_IN_WIDGETS),
			...Object.keys(dashboardWidgetRegistry),
		])
		const phantom = LIBRARY_WIDGET_KEYS.filter((key) => !rendered.has(key))
		expect(phantom).toEqual([])
	})
})

describe('the single-widget dashboard rule exempts every library widget', () => {
	/**
	 * A manifest whose one dashboard page holds a single body widget filling
	 * the whole 12×12 grid — the exact shape ADR-036 Decision 1 rejects when
	 * the widget is a custom registry component.
	 *
	 * @param {string} widgetKey The widget key under test.
	 * @return {object} A complete v2 manifest.
	 */
	function singleFullGridDashboard(widgetKey) {
		return {
			$schema: V2_SCHEMA_URL,
			version: '2.1.0',
			menu: [{ id: 'Home', label: 'Home', route: 'Home', order: 10 }],
			pages: [{
				id: 'Home',
				route: '/',
				type: 'dashboard',
				title: 'Home',
				widgets: [{ widgetKey, slot: 'body', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 12 }],
			}],
		}
	}

	const registryKeys = [...new Set([
		...Object.keys(BUILT_IN_WIDGETS),
		...Object.keys(dashboardWidgetRegistry),
	])].sort()

	it.each(registryKeys)('does not flag a full-grid "%s" as a custom page in disguise', (widgetKey) => {
		const ruleErrors = validateManifest(singleFullGridDashboard(widgetKey))
			.errors
			.filter((error) => error.includes('custom page in disguise'))
		expect(ruleErrors).toEqual([])
	})

	it('still flags a genuinely custom component', () => {
		// The rule must not have been neutered into never firing — widening an
		// exemption until it covers everything looks identical to fixing it.
		const ruleErrors = validateManifest(singleFullGridDashboard('CustomKpiPanel'))
			.errors
			.filter((error) => error.includes('custom page in disguise'))
		expect(ruleErrors.length).toBe(1)
	})
})
