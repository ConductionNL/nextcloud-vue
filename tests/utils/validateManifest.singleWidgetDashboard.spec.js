/**
 * Tests for the single-12×12-custom-widget dashboard rule
 * (ADR-036 Decision 1 / manifest-v2 spec
 * `manifest-single-widget-dashboard-rule`).
 *
 * Rule: a `type:"dashboard"` page containing exactly one widget that
 * covers the full body grid (slot:"body", gridX:0, gridY:0,
 * gridWidth:12, gridHeight:12) AND references a custom (non-library
 * built-in) widget component is rejected. The wrapping
 * `CnDashboardPage` adds visible nesting on top of the custom view,
 * producing dashboard-in-widget-in-dashboard rendering (pipelinq#521
 * documents six concrete occurrences).
 *
 * Covers the eight acceptance scenarios from the manifest-v2 spec
 * delta plus the canonical error message format from the
 * gate-manifest-validates spec delta.
 *
 * Implementation: post-schema check in `validateManifestV2` (Option B
 * from the issue — programmatic check, not pure JSON Schema; chosen so
 * the error message can include both the page id and the offending
 * widgetKey verbatim per ADR-036 Decision 4).
 */

import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://codeberg.org/Conduction/nextcloud-vue/raw/branch/main/src/schemas/app-manifest-v2.schema.json'

/**
 * Build a minimal v2 manifest wrapping a single page.
 *
 * @param {object} page The page definition under test.
 * @return {object} Complete v2 manifest.
 */
function manifestWith(page) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.0.0',
		menu: [],
		pages: [page],
	}
}

/**
 * Build a body-slot widget entry with the given widgetKey, defaulting
 * to the full 12×12 grid.
 *
 * @param {string} widgetKey The widget registry key.
 * @param {object} [overrides] Optional widget field overrides.
 * @return {object} Widget entry.
 */
function bodyWidget(widgetKey, overrides = {}) {
	return {
		widgetKey,
		slot: 'body',
		gridX: 0,
		gridY: 0,
		gridWidth: 12,
		gridHeight: 12,
		...overrides,
	}
}

describe('Single-12×12-custom-widget dashboard rule (ADR-036 Decision 1)', () => {
	// -----------------------------------------------------------------
	// Scenario 1 (FORBIDDEN): single 12×12 custom widget dashboard
	// -----------------------------------------------------------------
	it('rejects a dashboard with one 12×12 custom widget', () => {
		const manifest = manifestWith({
			id: 'Dashboard',
			route: '/dashboard',
			type: 'dashboard',
			title: 'app.dashboard',
			widgets: [bodyWidget('DashboardView')],
		})
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
		const ruleError = result.errors.find((e) => e.includes('single 12×12 custom widget'))
		expect(ruleError).toBeDefined()
		// Canonical error message format (ADR-036 Decision 4 /
		// gate-manifest-validates spec).
		expect(ruleError).toContain('pages[Dashboard]')
		expect(ruleError).toContain('widgets[0]')
		expect(ruleError).toContain('is type:"dashboard" with a single 12×12 custom widget')
		expect(ruleError).toContain('this is always a custom page in disguise')
		expect(ruleError).toContain('(a) declare as type:"custom" with component:"DashboardView"')
		expect(ruleError).toContain('kind:"page"')
		expect(ruleError).toContain('(b) split into N>1 widgets')
		expect(ruleError).toContain('ADR-036 Decision 1')
	})

	// -----------------------------------------------------------------
	// Scenario 2 (ALLOWED): single 12×12 built-in widget dashboard
	// -----------------------------------------------------------------
	it.each([
		['object-table'],
		['card-grid'],
		['form-renderer'],
		['map-viewer'],
		['chart'],
		['stats-block'],
	])('accepts a dashboard with one 12×12 built-in widget (%s)', (builtInKey) => {
		const manifest = manifestWith({
			id: 'BuiltInDashboard',
			route: '/built-in-dashboard',
			type: 'dashboard',
			title: 'app.built-in-dashboard',
			widgets: [bodyWidget(builtInKey)],
		})
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	// -----------------------------------------------------------------
	// Scenario 3 (ALLOWED): multi-widget dashboard
	// -----------------------------------------------------------------
	it('accepts a multi-widget dashboard (custom + custom)', () => {
		const manifest = manifestWith({
			id: 'Kennisbank',
			route: '/kennisbank',
			type: 'dashboard',
			title: 'app.kennisbank',
			widgets: [
				{ widgetKey: 'CnTreeView', slot: 'body', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 12 },
				{ widgetKey: 'CnIndexPage', slot: 'body', gridX: 4, gridY: 0, gridWidth: 8, gridHeight: 12 },
			],
		})
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('accepts a multi-widget dashboard with mixed custom + built-in', () => {
		const manifest = manifestWith({
			id: 'MixedDashboard',
			route: '/mixed',
			type: 'dashboard',
			title: 'app.mixed',
			widgets: [
				{ widgetKey: 'object-table', slot: 'body', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 12 },
				{ widgetKey: 'CustomKpiPanel', slot: 'body', gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 12 },
			],
		})
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	// -----------------------------------------------------------------
	// Scenario 4 (ALLOWED): single custom widget at partial grid
	// -----------------------------------------------------------------
	it('accepts a dashboard with a single custom widget at partial grid (gridWidth: 8)', () => {
		const manifest = manifestWith({
			id: 'PartialDashboard',
			route: '/partial',
			type: 'dashboard',
			title: 'app.partial',
			widgets: [bodyWidget('RapportageKpis', { gridWidth: 8 })],
		})
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('accepts a dashboard with a single custom widget at partial grid (gridHeight: 6)', () => {
		const manifest = manifestWith({
			id: 'PartialHeightDashboard',
			route: '/partial-height',
			type: 'dashboard',
			title: 'app.partial-height',
			widgets: [bodyWidget('RapportageKpis', { gridHeight: 6 })],
		})
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	// -----------------------------------------------------------------
	// Scenario 5 (ALLOWED): single 12×12 custom widget on type:"custom"
	// -----------------------------------------------------------------
	it('accepts a single 12×12 custom widget on a type:"custom" page', () => {
		const manifest = manifestWith({
			id: 'CustomPage',
			route: '/custom',
			type: 'custom',
			title: 'app.custom',
			component: 'DashboardView',
			widgets: [bodyWidget('DashboardView', { _note: 'why custom' })],
			_note: 'Bespoke dashboard not expressible via standard page types',
		})
		const result = validateManifestV2(manifest)
		// The rule should not fire — different page type entirely.
		const ruleError = (result.errors || []).find((e) => e.includes('single 12×12 custom widget'))
		expect(ruleError).toBeUndefined()
	})

	// -----------------------------------------------------------------
	// Scenario 6 (FORBIDDEN): widget grid coordinates omitted
	//
	// The v2 schema requires all four coord fields, so the post-schema
	// rule receives a defaulted widget. We still defensively assert the
	// rule would fire if a future schema relaxation allowed omitted
	// coords: the validator normalises missing coords to body-slot
	// defaults (gridX/Y=0, gridWidth/Height=12) BEFORE the kind check.
	// -----------------------------------------------------------------
	it('rejects a dashboard with a custom widget where coords default to full-grid (defensive)', () => {
		// Direct call into the rule by providing a widget object with
		// only widgetKey + slot — bypasses ajv's required-field check
		// to confirm the normalisation step would still flag it. We
		// achieve this by manually constructing a manifest that the
		// programmatic check evaluates after ajv has run; ajv will
		// also push its own "must have required property" errors, but
		// the rule error MUST be among them.
		const manifest = manifestWith({
			id: 'OmittedCoordsDashboard',
			route: '/omitted',
			type: 'dashboard',
			title: 'app.omitted',
			widgets: [{ widgetKey: 'DashboardView', slot: 'body' }],
		})
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
		const ruleError = result.errors.find((e) => e.includes('single 12×12 custom widget'))
		expect(ruleError).toBeDefined()
		expect(ruleError).toContain('pages[OmittedCoordsDashboard]')
		expect(ruleError).toContain('DashboardView')
	})

	// -----------------------------------------------------------------
	// Scenario 7 (NOT THIS RULE): off-origin full-area widget
	// -----------------------------------------------------------------
	it('does NOT fire the rule for an off-origin full-area widget (gridX:4, gridWidth:12)', () => {
		const manifest = manifestWith({
			id: 'OffOriginDashboard',
			route: '/off-origin',
			type: 'dashboard',
			title: 'app.off-origin',
			widgets: [bodyWidget('DashboardView', { gridX: 4 })],
		})
		const result = validateManifestV2(manifest)
		// The manifest is invalid (gridX + gridWidth = 16 exceeds 12),
		// but that is a different error class — the single-widget
		// dashboard rule MUST NOT fire for off-origin widgets.
		expect(result.valid).toBe(false)
		const ruleError = (result.errors || []).find((e) => e.includes('single 12×12 custom widget'))
		expect(ruleError).toBeUndefined()
		// And the grid-bounds error MUST be present.
		const boundsError = result.errors.find((e) => e.includes('exceeds 12'))
		expect(boundsError).toBeDefined()
	})

	// -----------------------------------------------------------------
	// Scenario 8 (ALLOWED): sidebar-only widget alongside body widget
	// -----------------------------------------------------------------
	it('accepts a dashboard with a body widget plus a sidebar widget (multi-widget across slots)', () => {
		const manifest = manifestWith({
			id: 'BodyPlusSidebarDashboard',
			route: '/body-plus-sidebar',
			type: 'dashboard',
			title: 'app.body-plus-sidebar',
			widgets: [
				bodyWidget('DashboardView'),
				{ widgetKey: 'AuditWidget', slot: 'sidebar', gridX: 0, gridY: 0, gridWidth: 1, gridHeight: 3 },
			],
		})
		const result = validateManifestV2(manifest)
		// The dashboard now has 2 widgets across slots, so the rule
		// must not fire — the sidebar widget makes it multi-widget.
		const ruleError = (result.errors || []).find((e) => e.includes('single 12×12 custom widget'))
		expect(ruleError).toBeUndefined()
	})

	// -----------------------------------------------------------------
	// Extra: rule fires once per offending page when several exist
	// (pipelinq#521 documents six concrete occurrences in one manifest)
	// -----------------------------------------------------------------
	it('reports one rule violation per offending page (does not short-circuit)', () => {
		const pages = ['Dashboard', 'MyWork', 'Rapportage'].map((id) => ({
			id,
			route: `/${id.toLowerCase()}`,
			type: 'dashboard',
			title: `app.${id}`,
			widgets: [bodyWidget(`${id}View`)],
		}))
		const manifest = {
			$schema: V2_SCHEMA_URL,
			version: '2.0.0',
			menu: [],
			pages,
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
		const ruleErrors = result.errors.filter((e) => e.includes('single 12×12 custom widget'))
		expect(ruleErrors).toHaveLength(3)
		expect(ruleErrors[0]).toContain('pages[Dashboard]')
		expect(ruleErrors[0]).toContain('DashboardView')
		expect(ruleErrors[1]).toContain('pages[MyWork]')
		expect(ruleErrors[1]).toContain('MyWorkView')
		expect(ruleErrors[2]).toContain('pages[Rapportage]')
		expect(ruleErrors[2]).toContain('RapportageView')
	})
})
