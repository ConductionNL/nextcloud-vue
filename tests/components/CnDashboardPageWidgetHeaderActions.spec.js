/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard widget's manifest `headerActions` are drawn in its card's title
 * row, as on a detail page (board DqCatalogus "Objecttype toevoegen", board
 * DqTermijnen "Kwartaalrapport downloaden"), and a click dispatches the action.
 *
 * @spec openspec/changes/dashboard-widget-header-actions/specs/dashboard-widget-header-actions/spec.md#requirement-a-dashboard-card-draws-its-widgets-header-actions
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'
import CnWidgetWrapper from '../../src/components/CnWidgetWrapper/CnWidgetWrapper.vue'

import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'

const WIDGETS = [
	{
		id: 'notes',
		type: 'text',
		title: 'Object types',
		content: { text: 'Hello' },
		headerActions: [
			{ label: 'Download', icon: 'TrayArrowDown', action: { type: 'navigate', target: '/reports' } },
			{ label: 'Add object type', variant: 'primary', action: { type: 'export', exportId: 'x' } },
		],
	},
	{ id: 'plain', type: 'text', title: 'Plain', content: { text: 'Bye' } },
]

async function flush() {
	for (let i = 0; i < 4; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

describe('CnDashboardPage: widget header actions', () => {
	it('draws a widget\'s header actions in its card and dispatches a click', async () => {
		const router = { push: jest.fn(() => Promise.resolve()), replace: jest.fn(() => Promise.resolve()) }
		const w = mount(CnDashboardPage, {
			props: { widgets: WIDGETS, layout: [{ id: 1, widgetId: 'notes', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }, { id: 2, widgetId: 'plain', gridX: 0, gridY: 2, gridWidth: 12, gridHeight: 2 }] },
			global: {
				mocks: { $router: router, $route: { name: 'Catalogue', params: {}, query: {} } },
				provide: { cnTranslate: (key) => `T(${key})` },
				stubs: { CnDashboardGrid: { props: ['layout'], template: '<div><template v-for="item in layout" :key="item.id"><slot name="widget" :item="item" /></template></div>' } },
			},
		})
		await flush()
		const wrappers = w.findAllComponents(CnWidgetWrapper)
		const notes = wrappers.find((c) => c.props('title') === 'T(Object types)')
		const plain = wrappers.find((c) => c.props('title') === 'T(Plain)')
		const buttons = notes.findAll('[data-testid="cn-widget-header-action"]')
		expect(buttons.map((b) => b.text())).toEqual(['T(Download)', 'T(Add object type)'])
		expect(plain.findAll('[data-testid="cn-widget-header-action"]')).toHaveLength(0)
		await buttons[0].trigger('click')
		expect(router.push).toHaveBeenCalledWith('/reports')
	})
})
