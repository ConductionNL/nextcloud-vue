/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A manifest can turn off the tab strip's own Actions menu
 * (`content.showActions: false`), for a board that draws none. The single-item
 * switches could not: Report a bug and the open panel's items kept the menu.
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'

const WIDGETS = [{ id: 'open-invoices', type: 'object-table', title: 'Open invoices', content: {} }]
const TABS = [{ widgetId: 'open-invoices', label: 'Open balance' }]
const STUBS = { CnDetailWidgetHost: { template: '<div class="host" />' } }

describe('CnTabsWidget showActions', () => {
	it('draws the Actions menu by default', async () => {
		const w = mount(CnTabsWidget, { props: { content: { tabs: TABS }, availableWidgets: WIDGETS }, global: { stubs: STUBS } })
		await nextTick()
		expect(w.findComponent({ name: 'CnActionsMenu' }).exists()).toBe(true)
	})

	it('draws no Actions menu with showActions false', async () => {
		const w = mount(CnTabsWidget, { props: { content: { tabs: TABS }, availableWidgets: WIDGETS, showActions: false }, global: { stubs: STUBS } })
		await nextTick()
		expect(w.findComponent({ name: 'CnActionsMenu' }).exists()).toBe(false)
	})

	it('takes it from the manifest content, as a detail host hands content keys over', async () => {
		const tabsWidget = {
			id: 'receivables-tabs',
			type: 'tabs',
			// The tab names no widget on the surface, so its panel is the
			// missing-widget state and no inner host fetches.
			content: { showActions: false, tabs: [{ widgetId: 'elsewhere', label: 'Open balance' }] },
		}
		const w = mount(CnDetailWidgetHost, {
			props: { widget: tabsWidget, chrome: 'bare', availableWidgets: [tabsWidget] },
		})
		await nextTick()
		const tabs = w.findComponent(CnTabsWidget)
		expect(tabs.exists()).toBe(true)
		expect(tabs.findComponent({ name: 'CnActionsMenu' }).exists()).toBe(false)
	})
})
