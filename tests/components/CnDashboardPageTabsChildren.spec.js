/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A tabs widget on a dashboard finds the widgets its tabs name
 * (dashboard-tabs-children). Board ShBank draws its account, statement and
 * unmatched-line lists as one tab strip; without the page's widget list every
 * tab read "No widget found".
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { fetchListTotal } from '../../src/utils/fetchFilterCounts.js'
import { resolveRegistryRenderer } from '../../src/utils/widgetDispatch.js'

import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'
import '../../src/components/CnWidgetObjectTable/dashboardRegistration.js'

jest.mock('../../src/utils/fetchFilterCounts.js', () => ({
	__esModule: true,
	fetchListTotal: jest.fn(),
}))

const WIDGETS = [
	{
		id: 'bank-tabs',
		type: 'tabs',
		title: 'Bank',
		content: { tabs: [{ widgetId: 'accounts', label: 'Accounts', countFrom: 'widget' }, { widgetId: 'statements', label: 'Statements' }] },
	},
	{ id: 'accounts', type: 'object-table', title: 'Accounts', content: { source: { register: 'shillinq', schema: 'BankAccount', filter: { active: true } } } },
	{ id: 'statements', type: 'object-table', title: 'Statements', content: { source: { register: 'shillinq', schema: 'BankStatement' } } },
	{ id: 'note', type: 'text', title: 'Note', content: { text: 'Hello' } },
]

const HostStub = { name: 'CnDetailWidgetHost', props: ['widget'], template: '<div class="host-stub">{{ widget && widget.id }}</div>' }

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

function mountPage(layout) {
	return mount(CnDashboardPage, {
		props: { widgets: WIDGETS, layout },
		global: { stubs: { CnDetailWidgetHost: HostStub, CnDashboardGrid: { props: ['layout'], template: '<div><template v-for="item in layout" :key="item.id"><slot name="widget" :item="item" /></template></div>' } } },
	})
}

beforeEach(() => {
	fetchListTotal.mockReset()
	fetchListTotal.mockResolvedValue(4)
})

describe('CnDashboardPage hands a container widget its siblings', () => {
	it('gives the tabs widget the page widgets, the registry and the surface', () => {
		const w = mountPage([{ id: 1, widgetId: 'bank-tabs', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }])
		const bindings = w.vm.containerBindings({ widgetId: 'bank-tabs' })
		expect(bindings.availableWidgets.map((d) => d.id)).toEqual(['bank-tabs', 'accounts', 'statements', 'note'])
		expect(bindings.surface).toBe('app-dashboard')
		expect(bindings.cnRegistry).toEqual({})
	})

	it('gives a leaf widget nothing', () => {
		const w = mountPage([{ id: 1, widgetId: 'note', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }])
		expect(w.vm.containerBindings({ widgetId: 'note' })).toEqual({})
		expect(w.vm.containerBindings({ widgetId: 'missing' })).toEqual({})
	})

	it('renders the widget each tab names, and counts the table in content.source', async () => {
		const w = mountPage([{ id: 1, widgetId: 'bank-tabs', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }])
		await flush()
		const tabs = w.findComponent(CnTabsWidget)
		expect(tabs.exists()).toBe(true)
		expect(tabs.text()).not.toContain('No widget found')
		expect(w.find('.host-stub').text()).toBe('accounts')
		expect(fetchListTotal).toHaveBeenCalledWith('shillinq', 'BankAccount', { active: true }, expect.any(Object))
		const strip = w.findAll('[role="tab"]').map((t) => t.text().replace(/\s+/g, ' ').trim())
		expect(strip[0]).toContain('4')
		expect(strip[1]).toBe('Statements')
	})
})

describe('resolveRegistryRenderer typeAsWritten', () => {
	it('keeps the alias first by default and takes the type as written on request', () => {
		const objectTable = getWidgetTypeEntry('object-table').renderer
		const table = getWidgetTypeEntry('table').renderer
		expect(resolveRegistryRenderer({ type: 'object-table' })).toBe(table)
		expect(resolveRegistryRenderer({ type: 'object-table' }, {}, { typeAsWritten: true })).toBe(objectTable)
		expect(resolveRegistryRenderer({ type: 'map-viewer' }, {}, { typeAsWritten: true })).toBe(getWidgetTypeEntry('map').renderer)
	})
})
