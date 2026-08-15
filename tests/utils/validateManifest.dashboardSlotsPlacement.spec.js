/**
 * Tests for the dashboard custom-widget slot-wiring rule
 * (validateManifestV2 post-schema check #6).
 *
 * A `type:"dashboard"` page wires each `type:"custom"` widget in
 * `config.widgets[]` to a registry component through the
 * PAGE-TOP-LEVEL `slots` map (`{ "widget-<id>": "<ComponentName>" }`),
 * which CnPageRenderer reads as `page.slots` and turns into the
 * `#widget-<id>` scoped slots CnDashboardPage consumes.
 *
 * Two failure modes — both pass JSON-schema validation (config is
 * `additionalProperties:true`) yet render every affected widget as the
 * `unavailableLabel` ("Widget not available") at runtime:
 *   (a) the slots map nested under `config` (config.slots).
 *   (b) a custom widget with no slots entry at all.
 *
 * Built-in widget types (stats-block, chart, tile, integration, …) do
 * not need a slots entry and must not be flagged.
 *
 * Regression for the decidesk-dashboard-v2-layout slot-placement bug
 * (2026-06-13): the slots map shipped under `config`, so 9 of 11
 * widgets rendered the unavailable placeholder while gate-22
 * (schema-only) reported the manifest clean.
 */

import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

/**
 * Build a v2 manifest wrapping a single dashboard page.
 *
 * @param {object} dashboardPage The dashboard page definition under test.
 * @return {object} Complete v2 manifest.
 */
function manifestWith(dashboardPage) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.0.0',
		dependencies: ['openregister'],
		menu: [{ id: 'Dashboard', label: 'Dashboard', icon: 'icon-category-dashboard', route: 'Dashboard', order: 10 }],
		pages: [dashboardPage],
	}
}

/**
 * Build a dashboard page with one custom widget + one stats-block, with
 * the slots map placed at the requested location.
 *
 * @param {('top'|'config'|'missing')} slotsLocation Where the slots map lives.
 * @return {object} Dashboard page definition.
 */
function dashboardWithSlots(slotsLocation) {
	const page = {
		id: 'Dashboard',
		route: '/',
		type: 'dashboard',
		title: 'Dashboard',
		config: {
			widgets: [
				{ id: 'active-decisions', type: 'custom', title: 'Active decisions' },
				{ id: 'minutes-in-review', type: 'stats-block', title: 'Minutes awaiting approval' },
			],
			layout: [
				{ id: '1', widgetId: 'active-decisions', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2 },
				{ id: '2', widgetId: 'minutes-in-review', gridX: 3, gridY: 0, gridWidth: 3, gridHeight: 2 },
			],
		},
	}
	const slots = { 'widget-active-decisions': 'ActiveDecisionsKpiWidget' }
	if (slotsLocation === 'top') page.slots = slots
	if (slotsLocation === 'config') page.config.slots = slots
	// 'missing' → no slots map anywhere
	return page
}

describe('Dashboard custom-widget slot wiring (validateManifestV2 check #6)', () => {
	it('accepts a dashboard with the slots map at the page top level', () => {
		const result = validateManifestV2(manifestWith(dashboardWithSlots('top')))
		const slotErrors = result.errors.filter((e) => /config\/slots|slot-component mapping/.test(e))
		expect(slotErrors).toEqual([])
	})

	it('rejects a dashboard with the slots map nested under config', () => {
		const result = validateManifestV2(manifestWith(dashboardWithSlots('config')))
		expect(result.valid).toBe(false)
		const err = result.errors.find((e) => e.includes('config/slots'))
		expect(err).toBeDefined()
		expect(err).toContain('pages[Dashboard]/config/slots')
		expect(err).toContain('must be at the page top level')
		expect(err).toContain('CnPageRenderer reads page.slots')
		// (b) must NOT also fire for the same widget — config.slots case is
		// reported once, by (a).
		const unavailableErr = result.errors.find((e) => e.includes('slot-component mapping'))
		expect(unavailableErr).toBeUndefined()
	})

	it('rejects a custom widget with no slots entry anywhere', () => {
		const result = validateManifestV2(manifestWith(dashboardWithSlots('missing')))
		expect(result.valid).toBe(false)
		const err = result.errors.find((e) => e.includes('slot-component mapping'))
		expect(err).toBeDefined()
		expect(err).toContain('pages[Dashboard]/config/widgets[0]')
		expect(err).toContain('custom widget "active-decisions"')
		expect(err).toContain('widget-active-decisions')
		expect(err).toContain('render the unavailable placeholder')
	})

	it('does not flag built-in widget types (stats-block) for a missing slot', () => {
		const result = validateManifestV2(manifestWith(dashboardWithSlots('top')))
		const statsBlockErr = result.errors.find((e) => e.includes('minutes-in-review'))
		expect(statsBlockErr).toBeUndefined()
	})

	it('flags every unmapped custom widget, listing each by id', () => {
		const page = {
			id: 'Dashboard',
			route: '/',
			type: 'dashboard',
			title: 'Dashboard',
			config: {
				widgets: [
					{ id: 'kpi-a', type: 'custom', title: 'A' },
					{ id: 'kpi-b', type: 'custom', title: 'B' },
				],
				layout: [],
			},
			slots: { 'widget-kpi-a': 'WidgetA' },
		}
		const result = validateManifestV2(manifestWith(page))
		// kpi-a is wired, kpi-b is not.
		expect(result.errors.find((e) => e.includes('"kpi-a"'))).toBeUndefined()
		const bErr = result.errors.find((e) => e.includes('"kpi-b"'))
		expect(bErr).toBeDefined()
		expect(bErr).toContain('widget-kpi-b')
	})

	it('ignores non-dashboard pages', () => {
		const page = {
			id: 'SomeIndex',
			route: '/x',
			type: 'index',
			title: 'X',
			config: { register: 'r', schema: 's', slots: { 'widget-x': 'Y' } },
		}
		const result = validateManifestV2(manifestWith(page))
		const slotErrors = result.errors.filter((e) => /config\/slots|slot-component mapping/.test(e))
		expect(slotErrors).toEqual([])
	})
})
