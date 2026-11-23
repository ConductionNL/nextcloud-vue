/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board look (DqZaakMeer): a tab listed in the Actions menu shows its icon in
 * front of its label.
 *
 * @spec openspec/changes/board-menu-tab-icons/specs/board-tabs-overflow-in-actions/spec.md
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

const WIDGETS = [
	{ id: 'w-overview', type: 'object-list', title: 'Overview' },
	{ id: 'w-notes', type: 'object-list', title: 'Notes' },
	{ id: 'w-related', type: 'object-list', title: 'Related', icon: 'LinkVariant' },
	{ id: 'w-plain', type: 'object-list', title: 'Plain' },
]

const CONTENT = {
	tabs: [
		{ widgetId: 'w-overview' },
		{ widgetId: 'w-notes', overflow: true, icon: 'NoteTextOutline' },
		{ widgetId: 'w-related', overflow: true },
		{ widgetId: 'w-plain', overflow: true },
	],
}

function mountWidget() {
	return mount(CnTabsWidget, {
		props: { content: CONTENT, availableWidgets: WIDGETS, objectId: 'o1', register: 'r', schema: 's' },
		global: {
			provide: { cnLook: 'board' },
			stubs: {
				CnDetailWidgetHost: { template: '<div class="host" />' },
				CnActionsMenu: { template: '<div class="menu"><slot name="lead-items" /></div>' },
				NcActionButton: { template: '<button class="item"><span class="icon"><slot name="icon" /></span><slot /></button>' },
				NcActionSeparator: true,
				CnIcon: { props: ['name'], template: '<i class="cn-icon" :data-name="name" />' },
			},
		},
	})
}

describe('CnTabsWidget board menu tab icons', () => {
	it('draws the tab icon, else the widget icon, and nothing for a tab without one', async () => {
		const w = mountWidget()
		await nextTick()
		const items = w.findAll('[data-testid="cn-tabs-widget-menu-tab"]')
		const icons = items.map((item) => item.find('.cn-icon').exists() ? item.find('.cn-icon').attributes('data-name') : null)
		expect(items.map((item) => item.text())).toEqual(['Notes', 'Related', 'Plain'])
		expect(icons).toEqual(['NoteTextOutline', 'LinkVariant', null])
		w.unmount()
	})
})
