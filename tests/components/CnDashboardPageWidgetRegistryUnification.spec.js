/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDashboardPage resolves a widget def's `type` against the SAME three layers
 * as CnWidgetGrid and CnDetailPage: consumer registry -> dashboard catalog ->
 * BUILT_IN_WIDGETS, with alias canonicalisation.
 *
 * It used to read the dashboard catalog ALONE, which made the dashboard the odd
 * surface out in two ways, both silent:
 *
 *  - a consumer override was IGNORED whenever the catalog carried the same
 *    name. `chart` and `stat` are in both registries, so an app registering its
 *    own (hrmq registers a TrendChartWidget under `chart`) got the library's
 *    component instead — it still rendered, just the wrong one, which is worse
 *    than a blank. Violates REQ-MVR-005 "custom widget overrides built-in".
 *  - a BUILT_IN-only type (`integration`, `metadata`) resolved to nothing.
 *
 * #709 unified CnWidgetGrid and CnDetailPage and missed CnDashboardPage.
 */
import { mount } from '@vue/test-utils'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'
import { BUILT_IN_WIDGETS } from '../../src/components/CnWidgetGrid/builtInWidgets.js'
// Populates the dashboard catalog (`chart`, `table`, `object-list`, …) so the
// consumer-override and catalog-fallback tests have real entries to work with.
// `chart` and `table` are registered INLINE in this module rather than by their
// own component index, so importing CnChartWidget alone leaves the catalog empty.
import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'

const ConsumerChart = { name: 'ConsumerChart', render: (h) => h('div') }

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

describe('CnDashboardPage — widget registry unification', () => {
	// `metadata` exists ONLY in BUILT_IN_WIDGETS once the catalog is fully
	// populated. Under catalog-only resolution it returned null and the widget
	// did not render at all.
	it('resolves `metadata`, a BUILT_IN-only type the catalog does not carry', () => {
		expect(BUILT_IN_WIDGETS.metadata).toBeTruthy()
		const w = mountPage({ type: 'metadata' })
		expect(w.vm.registryRenderer({ widgetId: 'w' })).toBe(BUILT_IN_WIDGETS.metadata)
	})

	it('does NOT claim `integration` — that type has its own branch', () => {
		// An `integration` def without an integrationId must fall through to
		// `unavailableLabel`, not to BUILT_IN_WIDGETS.integration. Resolving it
		// here would render a widget where the page means "unavailable", which
		// is exactly what CnDashboardPage.spec.js asserts.
		expect(BUILT_IN_WIDGETS.integration).toBeTruthy()
		const w = mountPage({ type: 'integration' })
		expect(w.vm.registryRenderer({ widgetId: 'w' })).toBeNull()
	})

	it('lets a consumer-registered widget override a catalog widget of the same name', () => {
		const w = mountPage({ type: 'chart', registry: { chart: { component: ConsumerChart } } })
		expect(w.vm.registryRenderer({ widgetId: 'w' })).toBe(ConsumerChart)
	})

	it('accepts a bare component (no `.component` wrapper) in the consumer registry', () => {
		const w = mountPage({ type: 'chart', registry: { chart: ConsumerChart } })
		expect(w.vm.registryRenderer({ widgetId: 'w' })).toBe(ConsumerChart)
	})

	it('still falls back to the dashboard catalog when the consumer registers nothing', () => {
		const w = mountPage({ type: 'chart' })
		const renderer = w.vm.registryRenderer({ widgetId: 'w' })
		expect(renderer).toBeTruthy()
		expect(renderer).not.toBe(ConsumerChart)
	})

	it('canonicalises an aliased spelling so either name resolves', () => {
		// `table` (catalog) and `object-table` (built-ins) are the same concept.
		expect(mountPage({ type: 'table' }).vm.registryRenderer({ widgetId: 'w' })).toBeTruthy()
		expect(mountPage({ type: 'object-table' }).vm.registryRenderer({ widgetId: 'w' })).toBeTruthy()
	})

	it('returns null for a type that exists in no layer, rather than throwing', () => {
		const w = mountPage({ type: 'definitely-not-a-widget' })
		expect(w.vm.registryRenderer({ widgetId: 'w' })).toBeNull()
	})
})
