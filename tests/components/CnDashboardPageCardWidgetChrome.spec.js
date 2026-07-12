/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A registry "card" widget (stat / gauge / delta) on the dashboard renders as a
 * bare tile: its own `content.label` is its headline, so the CnWidgetWrapper
 * chrome header is off by default and it carries no overflow Actions menu.
 * Brings CnDashboardPage in line with what CnDetailPage already does (ADR-062)
 * and with the cards-vs-widgets rule (cards have no Actions menu).
 *
 * Regression guards:
 *  - a card with no explicit title used to render the raw type name ("stat")
 *    in a chrome header;
 *  - the Show-title toggle wrote `showTitle` onto the widget def while the
 *    template read it off the layout item, so toggling it did nothing.
 */
import { mount } from '@vue/test-utils'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'
// Importing the widget's index self-registers `stat` (card: true) into the
// shared dashboard widget registry that isCardWidget consults.
import '../../src/components/CnStatWidget/index.js'

function mountPage({ widget = {}, layoutItem = {} } = {}) {
	return mount(CnDashboardPage, {
		propsData: {
			layout: [{ id: 1, widgetId: 'kpi', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2, ...layoutItem }],
			widgets: [{ id: 'kpi', type: 'stat', title: 'stat', content: { label: 'Herd size' }, ...widget }],
		},
		stubs: { CnStatWidget: true, CnWidgetWrapper: true },
	})
}

describe('CnDashboardPage — card widget chrome', () => {
	it('recognises a stat widget as a card widget', () => {
		const w = mountPage()
		expect(w.vm.isCardWidget({ widgetId: 'kpi' })).toBe(true)
	})

	it('hides the chrome header on a card by default, so the raw type name is never shown', () => {
		const w = mountPage()
		expect(w.vm.getWidgetShowTitle({ widgetId: 'kpi' })).toBe(false)
	})

	it('hides the Actions menu on a card by default', () => {
		const w = mountPage()
		expect(w.vm.getWidgetShowActions({ widgetId: 'kpi' })).toBe(false)
	})

	it('keeps header and Actions menu on a non-card registry widget', () => {
		const w = mountPage({ widget: { type: 'table' } })
		expect(w.vm.isCardWidget({ widgetId: 'kpi' })).toBe(false)
		expect(w.vm.getWidgetShowTitle({ widgetId: 'kpi' })).toBe(true)
		expect(w.vm.getWidgetShowActions({ widgetId: 'kpi' })).toBe(true)
	})

	it('honours an explicit showTitle on the widget def (what the style editor writes)', () => {
		const w = mountPage({ widget: { showTitle: true } })
		expect(w.vm.getWidgetShowTitle({ widgetId: 'kpi' })).toBe(true)
	})

	it('lets the layout item override the widget def', () => {
		const w = mountPage({ widget: { showTitle: true }, layoutItem: { showTitle: false } })
		expect(w.vm.getWidgetShowTitle(w.props('layout')[0])).toBe(false)
	})

	it('prefers customTitle over the def title once a header is opted back in', () => {
		const w = mountPage({ widget: { showTitle: true, customTitle: 'Herd' } })
		expect(w.vm.getWidgetTitle({ widgetId: 'kpi' })).toBe('Herd')
	})
})
